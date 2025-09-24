import {
  getContentType,
  getDevice,
  isRealMessage,
  normalizeMessageContent,
  proto,
  type WAMessage,
} from 'baileys';
import { db } from '../db';
import { reviveBuffer, transformBuffer } from '../utils';
import { extractText } from '../utils/extract-text';
import { traceSentry } from '@/instrument';

export interface IMessage {
  id: string;
  remote_jid: string;
  status: number;
  device_id: string;
  type: string;
  text: string | null;
  created_at: Date;
}

export abstract class MessageTable {
  public static async upsert(
    id: string,
    remoteJid: string,
    deviceId: string,
    data: WAMessage
  ): Promise<void> {
    const fromMe = data.key.fromMe || false;
    const isRealMsg = isRealMessage(data, deviceId);
    const text = extractText(data);
    const type = getContentType(data.message ?? undefined) || 'unknown';
    const device = getDevice(id);

    const buffer = transformBuffer(data);
    return db.messages.upsert(id,
      deviceId,
      remoteJid,
      fromMe,
      type,
      device,
      isRealMsg ?? false,
      text,
      buffer
    ).catch((err) => {
      traceSentry(err);
      throw err;
    });
  }

  public static async updateMessage(
    id: string,
    remoteJid: string,
    deviceId: string,
    update: Partial<WAMessage>
  ): Promise<void> {
    const message = normalizeMessageContent(update.message);
    const text = extractText(update);

    if (!message) {
      return;
    }

    return db.messages.updateMessage(id, remoteJid, deviceId, text, transformBuffer(message))
      .catch((err) => {
        traceSentry(err);
        throw err;
      });
  }

  public static async addReactions(
    id: string,
    remoteJid: string,
    deviceId: string,
    data: proto.IReaction
  ): Promise<void> {
    const reaction = transformBuffer(data);
    const reactions = {
      reactions: [reaction],
    };
    return db.messages.addReactions(id, remoteJid, deviceId, reaction, reactions)
      .catch((err) => {
        traceSentry(err);
        throw err;
      });
  }

  public static async get(id: string, remoteJid: string, deviceId: string): Promise<WAMessage | null> {
    const results = await db.messages.get(id, remoteJid, deviceId)
      .catch((err) => {
        traceSentry(err);
        throw err;
      });

    if (!results) {
      return null;
    }

    if (results.length === 0) {
      return null;
    }

    if (!results[0] || !results[0].data) {
      return null;
    }

    return reviveBuffer(results[0].data);
  }

  public static async getAll(
    device_id: string,
    fromMe: boolean = true,
    realMessage: boolean = true,
    limit = 10,
    page = 1
  ): Promise<IMessage[]> {
    return db.messages.getAll(
      device_id,
      fromMe,
      realMessage,
      limit,
      page
    )
      .catch((err) => {
        traceSentry(err);
        throw err;
      });
  }

  public static async clear(deviceId: string) {
    return db.messages.clear(deviceId)
      .catch((err) => {
        traceSentry(err);
        throw err;
      });
  }
}
