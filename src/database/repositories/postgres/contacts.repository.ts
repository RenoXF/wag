import type { SQL } from 'bun';
import type { IContactsRepository } from '../interfaces';
import type { Contact } from 'baileys';

export class PostgresContactsRepository implements IContactsRepository {
  constructor(private sql: SQL) {
  }

  async upsert(deviceId: string, data: Contact): Promise<void> {
    const insertedData = {
      created_at: new Date(),
      updated_at: new Date(),
      ...data,
    }
    await this.sql`INSERT INTO contacts ${this.sql(insertedData)};`;
  }

  async update(deviceId: string, data: Partial<Contact>): Promise<void> {
    const id = data.id;
    if (!id) return;

    const updatedData = {
      updated_at: new Date(),
      ...data,
    };

    await this.sql`UPDATE contacts
      SET
        ${this.sql(updatedData)}
      WHERE id = ${id} AND device_id = ${deviceId}
    `;
  }

  async getAll(deviceId: string): Promise<Contact[]> {
    const data = await this.sql<
      Contact[]
    >`SELECT * FROM contacts WHERE device_id = ${deviceId}`;
    return data;
  }

  async clear(deviceId: string): Promise<void> {
    await this.sql`DELETE FROM contacts WHERE device_id = ${deviceId}`;
  }
}
