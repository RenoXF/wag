import type { SQL } from "bun";
import type { IMessagesRepository } from "../interfaces";
import type { WAMessage } from "baileys";
import type { IMessage } from "@/database/models";

export class PostgresMessagesRepository implements IMessagesRepository {
  constructor(private sql: SQL) {
    //
  }

  public async upsert(
    id: string,
    deviceId: string,
    remoteJid: string,
    fromMe: boolean,
    type: string,
    device: string,
    isRealMsg: boolean,
    text: string | null,
    data: object
  ): Promise<void> {
    return await this.sql`INSERT INTO messages
        (id, device_id, remote_jid, from_me, type, device, is_real_message, text, data)
      VALUES
        (${id}, ${deviceId}, ${remoteJid}, ${fromMe}, ${type}, ${device}, ${isRealMsg}, ${text}, ${data})
      ON CONFLICT (id, device_id)
      DO UPDATE SET
      data = messages.data || EXCLUDED.data,
      text = COALESCE(EXCLUDED.text, messages.text),
      updated_at = NOW();
    `;
  }

  public async updateMessage(
    id: string,
    remoteJid: string,
    deviceId: string,
    text: string | null,
    message: object,
  ): Promise<void> {
    return await this.sql`UPDATE messages
        SET
          data = jsonb_set(
            data,
            '{message}',
            (data->'message') || ${message},
            true
          ),
          text = COALESCE(${text}, messages.text),
          updated_at = NOW()
        WHERE
          id = ${id} AND device_id = ${deviceId} AND remote_jid = ${remoteJid};
      `;
  }

  public async addReactions(
    id: string,
    remoteJid: string,
    deviceId: string,
    reaction: object,
    reactions: object,
  ): Promise<void> {
    return await this.sql`UPDATE messages
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

  public async get(id: string, remoteJid: string, deviceId: string): Promise<{ data: WAMessage }[]> {
    return await this.sql<{ data: WAMessage }[]>`SELECT data FROM messages
      WHERE id = ${id} AND device_id = ${deviceId} AND remote_jid = ${remoteJid}
      LIMIT 1;
    `;
  }

  public async getAll(
    device_id: string,
    fromMe: boolean = true,
    realMessage: boolean = true,
    limit = 10,
    page = 1
  ): Promise<IMessage[]> {
    const data =
      await this.sql`SELECT id, remote_jid, COALESCE((data ->> 'status')::integer, 0) AS status, device_id, type, text, created_at FROM messages
        WHERE device_id = ${device_id}
        -- AND from_me = ${fromMe}
        AND is_real_message = ${realMessage}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${(page - 1) * limit};
      `;

    if (!data) {
      return [];
    }

    return data as IMessage[];
  }

  public async clear(deviceId: string) {
    await this.sql`DELETE FROM messages WHERE device_id = ${deviceId}`;
  }
}
