import type { GroupMetadata, GroupParticipant } from "baileys";
import type { SQL } from "bun";
import type { IGroupsRepository } from "../interfaces";

export class PostgresGroupsRepository implements IGroupsRepository {
  constructor(private sql: SQL) {
  }

  public upsert(id: string, deviceId: string, data: Partial<GroupMetadata>): Promise<void> {
    return this.sql`INSERT INTO groups (id, device_id, data)
      VALUES
        (${id}, ${deviceId}, ${data})
      ON CONFLICT (id, device_id)
      DO UPDATE SET
        data = groups.data || EXCLUDED.data,
        updated_at = NOW();`;
  }

  public async get(id: string, deviceId: string): Promise<{ data: GroupMetadata }[]> {
    const results = await this.sql<{ data: GroupMetadata }[]>`
      SELECT data FROM groups
      WHERE id = ${id} AND device_id = ${deviceId}
    `;

    return results;
  }

  public async addParticipants(
    id: string,
    deviceId: string,
    participants: GroupParticipant[],
  ): Promise<void> {
    return this.sql`UPDATE groups
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

  public async removeParticipants(
    id: string,
    deviceId: string,
    participants: string[],
  ): Promise<void> {
    return this.sql`UPDATE groups
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
                  (participant_object->>'id') NOT IN (${this.sql(participants)})
          )
        ),
        updated_at = NOW()
      WHERE id = ${id} AND device_id = ${deviceId}
    `;
  }

  public async getAll(deviceId: string): Promise<{ data: GroupMetadata}[]> {
    const data = await this.sql<
      { data: GroupMetadata }[]
    >`SELECT data FROM groups WHERE device_id = ${deviceId}`;

    return data;
  }

  public async clear(deviceId: string): Promise<void> {
    await this.sql`DELETE FROM groups WHERE device_id = ${deviceId}`;
  }
}
