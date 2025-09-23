import type { SQL } from "bun";
import type { ISessionsRepository } from "../interfaces";
import type { AuthenticationCreds } from "baileys";

export class PostgresSessionRepository implements ISessionsRepository {
  constructor(private sql: SQL) {
    //
  }

  public upsert(id: string, deviceId: string, data: unknown): Promise<void> {
    return this.sql`
      INSERT INTO sessions (id, device_id, data)
      VALUES (${id}, ${deviceId}, ${data})
      ON CONFLICT (id, device_id) DO UPDATE SET
        data = EXCLUDED.data,
        updated_at = NOW()
    `;
  }

  public delete(id: string, deviceId: string): Promise<void> {
    return this.sql`
      DELETE FROM sessions
      WHERE id = ${id} AND device_id = ${deviceId}
    `;
  }

  public clear(deviceId: string): Promise<void> {
    return this.sql`
      DELETE FROM sessions
      WHERE device_id = ${deviceId}
    `;
  }

  public async get(id: string, deviceId: string): Promise<{ data: AuthenticationCreds }[]> {
    const results = await this.sql<{ data: AuthenticationCreds }[]>`
      SELECT data FROM sessions
      WHERE id = ${id} AND device_id = ${deviceId}
    `;

    return results;
  }

  public async getAllDeviceIds(): Promise<string[]> {
    const results = await this.sql<{ device_id: string }[]>`
      SELECT DISTINCT device_id FROM sessions
    `;
    return results.map(row => row.device_id);
  }
}
