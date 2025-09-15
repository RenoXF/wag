import { MessageTable } from '../../database';
import type { MessageModel } from './model';

export abstract class Message {
	static async getAll({
		deviceId,
		fromMe,
		realMessage,
		limit,
		page,
	}: MessageModel.GetAll) {
		return await MessageTable.getAll(
			deviceId,
			fromMe ?? true,
			realMessage ?? true,
			limit ?? 100,
			page ?? 1,
		);
	}
}
