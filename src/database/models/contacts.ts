import type { Contact } from 'baileys';
import sql from '../db';

export abstract class ContactTable {
	static async upsert(deviceId: string, data: Contact) {
		await sql`INSERT INTO contacts
        (
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
      );
    `;
	}

	static async update(deviceId: string, data: Partial<Contact>) {
		const id = data.id;
		if (!id) return;

		await sql`UPDATE contacts
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

	static async getAll(deviceId: string) {
		const data = await sql<
			Contact[]
		>`SELECT * FROM contacts WHERE device_id = ${deviceId}`;
		return data;
	}

	static async clear(deviceId: string) {
		await sql`DELETE FROM contacts WHERE device_id = ${deviceId}`;
	}
}
