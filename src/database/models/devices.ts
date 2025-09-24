import { db } from '../db';
import type { IDevice, IDeviceParams } from '../repositories/interfaces';

export abstract class DeviceTable {
  static async upsert(deviceId: string, data: IDeviceParams): Promise<void> {
    return db.devices.upsert(deviceId, data);
  }

  static async getAll(): Promise<IDevice[]> {
    return db.devices.getAll();
  }

  static async get(deviceId: string): Promise<IDevice | null> {
    return db.devices.get(deviceId);
  }

  static async delete(deviceId: string): Promise<void> {
    return db.devices.delete(deviceId);
  }

  static async clear(): Promise<void> {
    return db.devices.clear();
  }

  static async updateAll(data: IDeviceParams): Promise<void> {
    return db.devices.updateAll(data);
  }
}
