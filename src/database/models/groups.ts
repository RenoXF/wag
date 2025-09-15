import type { GroupMetadata, GroupParticipant } from 'baileys';
import sql from '../db';
import { reviveBuffer, transformBuffer } from '../utils';

export abstract class GroupTable {
	public static upsert(id: string, deviceId: string, data: object) {
		return sql`INSERT INTO groups (id, device_id, data)
      VALUES
        (${id}, ${deviceId}, ${transformBuffer(data)})
      ON CONFLICT (id, device_id)
      DO UPDATE SET
        data = groups.data || EXCLUDED.data,
        updated_at = NOW();`;
	}

	public static async get(id: string, deviceId: string) {
		const results = await sql`
      SELECT data FROM groups
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

		return reviveBuffer(results[0].data) as GroupMetadata;
	}

	public static async addParticipants(
		id: string,
		deviceId: string,
		participants: GroupParticipant[],
	) {
		return sql`UPDATE groups
      SET
        data = jsonb_set(
          data,
          '{participants}',
          (data->'participants') || ${participants},
          true
        ),
        updated_at = NOW()
      WHERE id = ${id} AND device_id = ${deviceId}`;
	}

	public static async removeParticipants(
		id: string,
		deviceId: string,
		participants: string[],
	) {
		return sql`UPDATE groups
      SET
        data = jsonb_set(
          data,
          '{participants}',
          (
              SELECT
                  jsonb_agg(participant_object)
              FROM
                  jsonb_array_elements(data->'participants') AS participant_object
              WHERE
                  (participant_object->>'id') NOT IN (${sql(participants)})
          )
        ),
        updated_at = NOW()
      WHERE id = ${id} AND device_id = ${deviceId}
    `;
	}

	public static async getAll(deviceId: string) {
		const data = await sql<
			{ data: GroupMetadata }[]
		>`SELECT data FROM groups WHERE device_id = ${deviceId}`;

		return data.map((item) => item.data);
	}

	public static async clear(deviceId: string) {
		await sql`DELETE FROM groups WHERE device_id = ${deviceId}`;
	}
}
