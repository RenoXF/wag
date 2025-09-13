import { MessageTable } from '../../database';
import { MessageModel } from './model';

export abstract class Message {
  static async getAll({
    deviceId,
    fromMe,
    realMessage,
    limit,
    perPage,
  }: MessageModel.GetAll) {
    return await MessageTable.getAll(
      deviceId,
      fromMe ?? true,
      realMessage ?? true,
      limit ?? 100,
      perPage ?? 1
    );
  }
}
