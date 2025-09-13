import {Elysia} from 'elysia';
import { Message } from './service';
import { MessageModel } from './model';

export const messages = new Elysia({
  prefix: '/messages'
})
.get('/', async ({query}) => {
  const data = await Message.getAll(query);

  return {
    data,
  };
}, {
  query: MessageModel.GetAll
})
