import {Elysia} from 'elysia';
import { Group } from './service';
import { GroupModel } from './model';

export const groups = new Elysia({
  prefix: '/groups'
})
.get('/', async ({query}) => {
  const data = await Group.getAll({deviceId: query.deviceId});

  return {
    data,
  };
}, {
  query: GroupModel.index
})
