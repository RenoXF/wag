import type { SQL } from 'bun';
import type { IContactsRepository } from '../interfaces';
import type { Contact } from 'baileys';

export class PostgresContactsRepository implements IContactsRepository {
  constructor(private sql: SQL) {
  }

  async upsert(deviceId: string, data: Contact): Promise<void> {
    const insertedData = {
      id: data.id,
      lid: data.lid,
      device_id: deviceId,
      phone_number: data.phoneNumber,
      name: data.name,
      notify: data.notify,
      verified_name: data.verifiedName,
      img_url: data.imgUrl,
      status: data.status,
      created_at: new Date(),
      updated_at: new Date(),
    }
    await this.sql`INSERT INTO contacts ${this.sql(insertedData)}
      ON CONFLICT (id, device_id) DO UPDATE SET
        lid = EXCLUDED.lid,
        phone_number = EXCLUDED.phone_number,
        name = EXCLUDED.name,
        notify = EXCLUDED.notify,
        verified_name = EXCLUDED.verified_name,
        img_url = EXCLUDED.img_url,
        status = EXCLUDED.status,
        updated_at = NOW();`;
  }

  async update(deviceId: string, data: Partial<Contact>): Promise<void> {
    const id = data.id;
    if (!id) return;

    const updatedData = {
      updated_at: new Date(),
      id: data.id,
      lid: data.lid,
      device_id: deviceId,
      phone_number: data.phoneNumber,
      name: data.name,
      notify: data.notify,
      verified_name: data.verifiedName,
      img_url: data.imgUrl,
      status: data.status,
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
