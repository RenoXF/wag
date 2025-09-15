import { Elysia } from 'elysia';
import { Group } from './service';
import { GroupModel } from './model';
import { WaStore } from '../../whatsapp';

export const groups = new Elysia({
  prefix: '/groups',
})
  .get(
    '/',
    async ({ query }) => {
      const data = await Group.getAll({ deviceId: query.deviceId });

      return {
        data,
      };
    },
    {
      query: GroupModel.index,
    }
  )
  .post(
    '/refresh',
    async ({ body, set }) => {
      const whatsapp = WaStore.get(body.deviceId);

      if (!whatsapp) {
        set.status = 404;
        return {
          error: 'Device not found',
        };
      }

      const res = await whatsapp.refreshGroupMetadata();

      if (res) {
        return { success: true };
      } else {
        set.status = 500;

        return {
          error: 'Failed to refresh group metadata, please try again later',
        };
      }
    },
    {
      body: GroupModel.index,
    }
  );
