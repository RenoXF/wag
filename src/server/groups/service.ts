import { GroupTable } from '../../database';
import type { GroupModel } from './model';

export abstract class Group {
	static async getAll({ deviceId }: GroupModel.index) {
		return await GroupTable.getAll(deviceId);
	}
}
