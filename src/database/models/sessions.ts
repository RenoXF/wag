import sql from '../db';
import { reviveBuffer, transformBuffer } from '../utils';

export abstract class SessionTable {
	public static upsert(id: string, deviceId: string, data: unknown) {
		return sql`
      INSERT INTO sessions (id, device_id, data)
      VALUES (${id}, ${deviceId}, ${transformBuffer(data)})
      ON CONFLICT (id, device_id) DO UPDATE SET
        data = EXCLUDED.data,
        updated_at = NOW()
    `;
	}

	public static delete(id: string, deviceId: string) {
		return sql`
      DELETE FROM sessions
      WHERE id = ${id} AND device_id = ${deviceId}
    `;
	}

	public static clear(deviceId: string) {
		return sql`
      DELETE FROM sessions
      WHERE device_id = ${deviceId}
    `;
	}

	public static async get(id: string, deviceId: string) {
		const results = await sql`
      SELECT data FROM sessions
      WHERE id = ${id} AND device_id = ${deviceId}
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

		return reviveBuffer(results[0].data);
	}
}
