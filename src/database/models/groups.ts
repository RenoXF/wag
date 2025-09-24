import type { GroupMetadata, GroupParticipant } from 'baileys';
import { db } from '../db';
import { reviveBuffer, transformBuffer } from '../utils';
import { traceSentry } from '@/instrument';

export abstract class GroupTable {
  public static upsert(id: string, deviceId: string, data: Partial<GroupMetadata>): Promise<void> {
    return db.groups.upsert(id, deviceId, transformBuffer(data))
      .catch((err) => {
        traceSentry(err);
        throw err;
      });
  }

  public static async get(id: string, deviceId: string): Promise<GroupMetadata | null> {
    const results = await db.groups.get(id, deviceId)
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

    return reviveBuffer<GroupMetadata>(results[0].data);
  }

  public static async addParticipants(
    id: string,
    deviceId: string,
    participants: GroupParticipant[],
  ): Promise<void> {
    return db.groups.addParticipants(id, deviceId, participants)
      .catch((err) => {
        traceSentry(err);
        throw err;
      });
  }

  public static async removeParticipants(
    id: string,
    deviceId: string,
    participants: string[],
  ): Promise<void> {
    return db.groups.removeParticipants(id, deviceId, participants)
      .catch((err) => {
        traceSentry(err);
        throw err;
      });
  }

  public static async getAll(deviceId: string): Promise<GroupMetadata[]> {
    const results = await db.groups.getAll(deviceId)
      .catch((err) => {
        traceSentry(err);
        throw err;
      });

    return results.map((item) => reviveBuffer(item.data));
  }

  public static async clear(deviceId: string): Promise<void> {
    return db.groups.clear(deviceId)
      .catch((err) => {
        traceSentry(err);
        throw err;
      });
  }
}
