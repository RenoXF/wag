import type { GroupMetadata, GroupParticipant } from 'baileys';
import { db } from '../db';
import { reviveBuffer, transformBuffer } from '../utils';

export abstract class GroupTable {
  public static upsert(id: string, deviceId: string, data: Partial<GroupMetadata>): Promise<void> {
    return db.groups.upsert(id, deviceId, transformBuffer(data));
  }

  public static async get(id: string, deviceId: string): Promise<GroupMetadata | null> {
    const results = await db.groups.get(id, deviceId);

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
    return db.groups.addParticipants(id, deviceId, participants);
  }

  public static async removeParticipants(
    id: string,
    deviceId: string,
    participants: string[],
  ): Promise<void> {
    return db.groups.removeParticipants(id, deviceId, participants);
  }

  public static async getAll(deviceId: string): Promise<GroupMetadata[]> {
    const results = await db.groups.getAll(deviceId);
    return results.map((item) => reviveBuffer(item.data));
  }

  public static async clear(deviceId: string): Promise<void> {
    return db.groups.clear(deviceId);
  }
}
