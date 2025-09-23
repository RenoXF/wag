import type { SQL } from 'bun';
import type { IContactsRepository, IDevice, IDeviceParams, IDevicesRepository } from '../interfaces';

export class PostgresDevicesRepository implements IDevicesRepository {
  constructor(private sql: SQL) {
  }

  public upsert(id: string, device: IDeviceParams): Promise<void> {
    return this.sql`
      INSERT INTO devices (id, name, description, browser, os, version, connection_state, webhook_url, qr_string, pair_code, created_at, updated_at)
      VALUES (${id}, ${device.name}, ${device.description}, ${device.browser}, ${device.os}, ${device.version}, ${device.connection_state}, ${device.webhook_url}, ${device.qr_string}, ${device.pair_code}, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        browser = EXCLUDED.browser,
        os = EXCLUDED.os,
        version = EXCLUDED.version,
        connection_state = EXCLUDED.connection_state,
        qr_string = EXCLUDED.qr_string,
        pair_code = EXCLUDED.pair_code,
        updated_at = NOW()
    `;
  }

  public async get(id: string): Promise<IDevice | null> {
    const results = await this.sql<IDevice[]>`SELECT * FROM devices WHERE id = ${id} LIMIT 1`;

    const result = results[0];

    if (!result) {
      return null;
    }

    return result;
  }

  public async getAll(): Promise<IDevice[]> {
    const results = await this.sql<IDevice[]>`SELECT * FROM devices ORDER BY created_at DESC`;
    return results;
  }

  public delete(id: string): Promise<void> {
    return this.sql`DELETE FROM devices WHERE id = ${id}`;
  }

  public clear(): Promise<void> {
    return this.sql`DELETE FROM devices`;
  }
}
