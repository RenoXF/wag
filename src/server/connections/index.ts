import { Elysia } from 'elysia';
import { ConnectionModel } from './model';
import { Connection } from './service';

export const connections = new Elysia({
  prefix: '/connections',
  detail: {
    tags: ['Connections'],
    description: 'Endpoints to manage connections',
  }
})
  .get('/', async () => {
    const data = await Connection.getAll();

    return {
      data: data,
    };
  }, {
    detail: {
      summary: 'Get all active connections',
      description: 'Retrieve a list of all active connections with their details.',
    }
  })
  .post(
    '/start',
    async ({ body, set }) => {
      if (Connection.has({ deviceId: body.deviceId })) {
        set.status = 400;

        return { error: 'Connection already exists' };
      }
      const webhookUrl = body.webhookUrl;

      if (webhookUrl) {
        try {
          const res = await fetch(webhookUrl, {
            method: 'POST',
            body: JSON.stringify({ event: 'ping' }),
          });

          if (!res.ok) {
            set.status = 400;

            return { error: 'Webhook URL must be return 200 HTTP Code' };
          }
        } catch (error) {
          console.error('Error fetching webhook URL:', error);
          set.status = 400;

          return error instanceof Error
            ? { error: 'Invalid webhook URL', message: error.message }
            : { error: 'Invalid webhook URL' };
        }
      }

      Connection.start(body);

      return {
        message: 'Connection started',
      };
    },
    {
      body: ConnectionModel.Start,
      detail: {
        summary: 'Start a new connections',
        description: 'Initiate a new connection with the provided device ID and optional webhook URL.',
      }
    }
  )
  .post(
    '/stop',
    async ({ body, set }) => {
      if (!Connection.has({ deviceId: body.deviceId })) {
        set.status = 400;
        return { error: 'Connection not found' };
      }

      Connection.stop(body);

      return {
        message: 'Connection stopped',
      };
    },
    {
      body: ConnectionModel.Default,
      detail: {
        summary: 'Stop an active connection',
        description: 'Terminate an existing connection using the provided device ID.',
      }
    }
  )
  .post(
    '/logout',
    async ({ body, set }) => {
      if (!Connection.has({ deviceId: body.deviceId })) {
        set.status = 400;
        return { error: 'Connection not found' };
      }

      Connection.logout(body);

      return {
        message: 'Connection logged out',
      };
    },
    {
      body: ConnectionModel.Default,
      detail: {
        summary: 'Logout from an active connection',
        description: 'Log out from an existing connection using the provided device ID.',
      }
    }
  );
