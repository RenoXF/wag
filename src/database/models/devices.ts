import { traceSentry } from '@/instrument';
import { db } from '../db';
import type { IDevice, IDeviceParams } from '../repositories/interfaces';

export abstract class DeviceTable {
  static async upsert(deviceId: string, data?: IDeviceParams | null): Promise<void> {
    if (!data) {
      return;
    }

    return db.devices.upsert(deviceId, data)
      .catch((err) => {
        traceSentry(err);
        throw err;
      })
  }

  static async getAll(): Promise<IDevice[]> {
    return db.devices.getAll()
      .catch((err) => {
        traceSentry(err);
        throw err;
      })
  }

  static async get(deviceId: string): Promise<IDevice | null> {
    return db.devices.get(deviceId)
      .catch((err) => {
        traceSentry(err);
        throw err;
      })
  }

  static async delete(deviceId: string): Promise<void> {
    return db.devices.delete(deviceId)
      .catch((err) => {
        traceSentry(err);
        throw err;
      })
  }

  static async clear(): Promise<void> {
    return db.devices.clear()
      .catch((err) => {
        traceSentry(err);
        throw err;
      })
  }

  static async updateAll(data: IDeviceParams): Promise<void> {
    return db.devices.updateAll(data)
      .catch((err) => {
        traceSentry(err);
        throw err;
      })
  }
}
