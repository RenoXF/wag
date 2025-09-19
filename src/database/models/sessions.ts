import type { AuthenticationCreds } from 'baileys';
import { db } from '../db';
import { reviveBuffer, transformBuffer } from '../utils';

export abstract class SessionTable {
	public static upsert(id: string, deviceId: string, data: unknown): Promise<void> {
    return db.sessions.upsert(id, deviceId, transformBuffer(data));
	}

	public static delete(id: string, deviceId: string): Promise<void> {
		return db.sessions.delete(id, deviceId);
	}

	public static clear(deviceId: string): Promise<void> {
		return db.sessions.clear(deviceId);
	}

	public static async get(id: string, deviceId: string): Promise<AuthenticationCreds | null> {
    const results = await db.sessions.get(id, deviceId);

    if (!results) {
      return null;
    }

    if (results.length === 0) {
      return null;
    }

    if (!results?.[0] || !results[0].data) {
      return null;
    }

    return reviveBuffer(results[0].data);
  }
}
