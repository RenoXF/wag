import type { Contact } from 'baileys';
import { db } from '../db';

export abstract class ContactTable {
	static async upsert(deviceId: string, data: Contact): Promise<void> {
    return db.contacts.upsert(deviceId, data);
	}

	static async update(deviceId: string, data: Partial<Contact>): Promise<void> {
    return db.contacts.update(deviceId, data);
	}

	static async getAll(deviceId: string): Promise<Contact[]> {
    return db.contacts.getAll(deviceId);
	}

	static async clear(deviceId: string): Promise<void> {
    return db.contacts.clear(deviceId);
	}
}
