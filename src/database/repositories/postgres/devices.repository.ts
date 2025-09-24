import type { SQL } from 'bun';
import type { IDevice, IDeviceParams, IDevicesRepository } from '../interfaces';

export class PostgresDevicesRepository implements IDevicesRepository {
  constructor(private sql: SQL) {
  }

  public upsert(id: string, device: IDeviceParams): Promise<void> {
    const insertedData = {
      id: id,
      created_at: new Date(),
      updated_at: new Date(),
      ...device,
    };
    return this.sql`
      INSERT INTO devices ${this.sql(insertedData)}
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

  public updateAll(data: IDeviceParams): Promise<void> {
    const updatedData = {
      ...data,
      updated_at: new Date(),
    };
    return this.sql`
      UPDATE devices SET ${this.sql(updatedData)}
    `;
  }
}
