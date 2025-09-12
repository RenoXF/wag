import {
  isRealMessage,
  normalizeMessageContent,
  getContentType,
  type proto,
  type WAMessage,
} from 'baileys';
import sql from '../db';
import { reviveBuffer, transformBuffer } from '../utils';

const extractText = (message: Partial<WAMessage>): string | null => {
  const normalizedMessage = normalizeMessageContent(message.message);

  return (
    normalizedMessage?.conversation ||
    normalizedMessage?.extendedTextMessage?.text ||
    normalizedMessage?.imageMessage?.caption ||
    normalizedMessage?.documentMessage?.caption ||
    normalizedMessage?.videoMessage?.caption ||
    null
  );
};

export abstract class MessageTable {
  public static async upsert(
    id: string,
    remoteJid: string,
    deviceId: string,
    data: WAMessage
  ) {
    const fromMe = data.key.fromMe || false;
    const isRealMsg = isRealMessage(data, deviceId);
    const text = extractText(data);
    const type = getContentType(data.message ?? undefined) || 'unknown';

    return await sql`INSERT INTO messages (id, device_id, remote_jid, from_me, type, is_real_message, text, data)
      VALUES
        (${id}, ${deviceId}, ${remoteJid}, ${fromMe}, ${type}, ${isRealMsg}, ${text}, ${transformBuffer(
      data
    )})
      ON CONFLICT (id, device_id)
      DO UPDATE SET
        data = messages.data || EXCLUDED.data,
        text = COALESCE(EXCLUDED.text, messages.text),
        updated_at = NOW();
    `;
  }

  public static async updateMessage(
    id: string,
    remoteJid: string,
    deviceId: string,
    update: Partial<WAMessage>
  ) {
    const message = normalizeMessageContent(update.message);
    const text = extractText(update);

    if (!message) {
      return;
    }

    return await sql`UPDATE messages
      SET
        data = jsonb_set(
          data,
          '{message}',
          (data->'message') || ${transformBuffer(message)},
          true
        ),
        text = COALESCE(${text}, messages.text),
        updated_at = NOW()
      WHERE
        id = ${id} AND device_id = ${deviceId} AND remote_jid = ${remoteJid};
    `;
  }

  public static async addReactions(
    id: string,
    remoteJid: string,
    deviceId: string,
    data: proto.IReaction
  ) {
    const reaction = transformBuffer(data);
    const reactions = {
      reactions: [reaction],
    };

    return await sql`UPDATE messages
      SET
        data = CASE
          WHEN data ? 'reactions' THEN
            jsonb_set(
              data,
              '{reactions}',
              (data -> 'reactions') || ${reaction}
            )
          ELSE
            data || ${reactions}
        END,
        updated_at = NOW()
      WHERE
        id = ${id} AND device_id = ${deviceId} AND remote_jid = ${remoteJid};
    `;
  }

  public static async get(id: string, remoteJid: string, deviceId: string) {
    const results = await sql`SELECT data FROM messages
      WHERE id = ${id} AND device_id = ${deviceId} AND remote_jid = ${remoteJid}
      LIMIT 1;
    `;

    if (!results) {
      return null;
    }

    if (results.length === 0) {
      return null;
    }

    if (!results?.[0].data) {
      return null;
    }

    return reviveBuffer(results[0].data) as WAMessage;
  }

  public static async clear(deviceId: string) {
    await sql`DELETE FROM messages WHERE device_id = ${deviceId}`;
  }
}
