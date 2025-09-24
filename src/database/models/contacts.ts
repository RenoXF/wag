import type { Contact } from 'baileys';
import { db } from '../db';
import { traceSentry } from '@/instrument';

export abstract class ContactTable {
  static async upsert(deviceId: string, data: Contact): Promise<void> {
    return db.contacts.upsert(deviceId, data)
      .catch((err) => {
        traceSentry(err, {
          data: {
            deviceId,
          },
        });
        throw err;
      });
  }

  static async update(deviceId: string, data: Partial<Contact>): Promise<void> {
    return db.contacts.update(deviceId, data)
      .catch((err) => {
        traceSentry(err, {
          data: {
            deviceId,
          },
        });
        throw err;
      })
  }

  static async getAll(deviceId: string): Promise<Contact[]> {
    return db.contacts.getAll(deviceId)
      .catch((err) => {
        traceSentry(err, {
          data: {
            deviceId,
          },
        });
        throw err;
      })
  }

  static async clear(deviceId: string): Promise<void> {
    return db.contacts.clear(deviceId)
      .catch((err) => {
        traceSentry(err, {
          data: {
            deviceId,
          },
        });
        throw err;
      })
  }
}
