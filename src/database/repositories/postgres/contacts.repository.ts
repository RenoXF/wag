import type { SQL } from 'bun';
import type { IContactsRepository } from '../interfaces';
import type { Contact } from 'baileys';

export class PostgresContactsRepository implements IContactsRepository {
  constructor(private sql: SQL) {
  }

  async upsert(deviceId: string, data: Contact): Promise<void> {
    await this.sql`INSERT INTO contacts (
      id,
      device_id,
      lid,
      phone_number,
      img_url,
      name,
      notify,
      status,
      verified_name,
      created_at,
      updated_at
    ) VALUES (
      ${data.id},
      ${deviceId},
      ${data.lid},
      ${data.phoneNumber},
      ${data.imgUrl},
      ${data.name},
      ${data.notify},
      ${data.status},
      ${data.verifiedName},
      now(),
      now()
    );`;
  }

  async update(deviceId: string, data: Partial<Contact>): Promise<void> {
    const id = data.id;
    if (!id) return;

    await this.sql`UPDATE contacts
      SET
        lid = COALESCE(${data.lid}, lid),
        phone_number = COALESCE(${data.phoneNumber}, phone_number),
        img_url = COALESCE(${data.imgUrl}, img_url),
        name = COALESCE(${data.name}, name),
        notify = COALESCE(${data.notify}, notify),
        status = COALESCE(${data.status}, status),
        verified_name = COALESCE(${data.verifiedName}, verified_name)
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
