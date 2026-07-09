import { SessionManager } from '@/whatsapp';
import { isJidGroup, isLidUser, isPnUser } from 'baileys';
import { Elysia, sse, t } from 'elysia';

const manager = SessionManager.getInstance();

const validateJid = (jid: string) => {
  if (!(isJidGroup(jid) || isPnUser(jid) || isLidUser(jid))) {
    throw new Error(
      'Invalid recipient JID, must be a group or user JID, like: "123456789@g.us" or "123456789@s.whatsapp.net", "123456789@lid"',
    );
  }

  if (jid.startsWith('+')) {
    throw new Error(
      'Invalid recipient JID, must not include the "+" sign. Use the format "123456789@s.whatsapp.net"',
    );
  }
};

const getWA = (deviceId: string) => {
  const whatsapp = manager.getSession(deviceId);

  if (!whatsapp) {
    throw new Error(`Device ${deviceId} not found, please connect first`);
  }

  return whatsapp;
};

export const messages = new Elysia({
  prefix: '/messages',
  detail: {
    tags: ['Messages'],
    summary: 'Messages',
    description: 'Endpoints to manage and send messages via WhatsApp sessions',
  },
})
  .get(
    '/:deviceId',
    ({ params: { deviceId }, set }) => {
      try {
        const whatsapp = getWA(deviceId);
        const dbQueries = whatsapp.getDbQueries();

        if (!dbQueries) {
          set.status = 400;
          return {
            success: false,
            message: 'Database not initialized for this session',
          };
        }

        const chats = dbQueries.listChatJids();
        return {
          success: true,
          data: chats,
        };
      } catch (error) {
        set.status = 400;
        return {
          success: false,
          message:
            error instanceof Error ? error.message : 'Failed to list chats',
        };
      }
    },
    {
      params: t.Object({
        deviceId: t.String({
          minLength: 1,
          pattern: '^[a-zA-Z0-9_\\-:@\.\|\!]+$',
        }),
      }),
      detail: {
        summary: 'List Chat JIDs',
        description: 'Get all unique chat JIDs with last message for a session',
      },
    },
  )
  .get(
    '/:deviceId/:chatJid',
    ({ params: { deviceId, chatJid }, query, set }) => {
      try {
        const whatsapp = getWA(deviceId);
        const dbQueries = whatsapp.getDbQueries();

        if (!dbQueries) {
          set.status = 400;
          return {
            success: false,
            message: 'Database not initialized for this session',
          };
        }

        const limit = query.limit ?? 50;
        const offset = query.offset ?? 0;
        const messages = dbQueries.listMessages(chatJid, limit, offset);

        return {
          success: true,
          data: messages,
        };
      } catch (error) {
        set.status = 400;
        return {
          success: false,
          message:
            error instanceof Error ? error.message : 'Failed to list messages',
        };
      }
    },
    {
      params: t.Object({
        deviceId: t.String({
          minLength: 1,
          pattern: '^[a-zA-Z0-9_\\-:@\.\|\!]+$',
        }),
        chatJid: t.String({
          minLength: 1,
        }),
      }),
      query: t.Object({
        limit: t.Optional(t.Number({ default: 50, maximum: 200 })),
        offset: t.Optional(t.Number({ default: 0 })),
      }),
      detail: {
        summary: 'List Messages by Chat JID',
        description: 'Get messages for a specific chat JID with pagination',
      },
    },
  )
  .get(
    '/sse/:deviceId',
    async function* ({ params: { deviceId }, set }) {
      const whatsapp = manager.getSession(deviceId);
      if (!whatsapp) {
        set.status = 404;
        yield sse(JSON.stringify({ error: 'Session not found' }));
        return;
      }

      const dbQueries = whatsapp.getDbQueries();
      if (!dbQueries) {
        set.status = 400;
        yield sse(JSON.stringify({ error: 'Database not initialized' }));
        return;
      }

      let lastCount = 0;
      const checkInterval = 2000;

      yield sse(JSON.stringify({ type: 'connected', sessionId: deviceId }));

      while (true) {
        try {
          const chats = dbQueries.listChatJids();
          const currentCount = chats.reduce((sum, c) => sum + c.count, 0);

          if (currentCount !== lastCount) {
            lastCount = currentCount;
            yield sse(JSON.stringify({ type: 'messages_update', data: chats }));
          }
        } catch (_error) {
          yield sse(
            JSON.stringify({
              type: 'error',
              message: 'Failed to fetch messages',
            }),
          );
        }

        await new Promise((resolve) => setTimeout(resolve, checkInterval));
      }
    },
    {
      params: t.Object({
        deviceId: t.String({
          minLength: 1,
          pattern: '^[a-zA-Z0-9_\\-:@\.\|\!]+$',
        }),
      }),
      detail: {
        summary: 'Message Updates via SSE',
        description:
          'Real-time message updates for a session using Server-Sent Events',
      },
    },
  )
  .post(
    '/send-text-message',
    ({ body, set }) => {
      const whatsapp = getWA(body.deviceId);
      const jid = body.recipient;
      validateJid(jid);

      const id = body.id ?? null;
      const delay = body.delay ?? undefined;
      const sendPresence = body.sendPresence ?? false;
      const dailyLimit = body.dailyLimit ?? undefined;

      whatsapp.sendMessage(id ?? Bun.randomUUIDv7(), jid, {
        text: body.message,
      }, undefined, sendPresence, delay, dailyLimit);

      return {
        success: true,
      };
    },
    {
      detail: {
        summary: 'Send Text Message',
        description:
          'Send a text message to a WhatsApp user or group via the specified session.',
      },
      body: t.Object({
        deviceId: t.String({
          minLength: 1,
          pattern: '^[a-zA-Z0-9_\\-:@\.\|\!]+$',
        }),
        id: t.Optional(t.Nullable(t.String())),
        delay: t.Optional(t.Number({ minimum: 0, maximum: 300 })),
        sendPresence: t.Optional(t.Boolean()),
        dailyLimit: t.Optional(t.Number({ minimum: 1, maximum: 1000 })),
        message: t.String({
          minLength: 1,
          maxLength: 4096,
        }),
        recipient: t.String({
          minLength: 1,
          examples: [
            '456789765@g.us',
            '123456789@c.us',
            '6289522323@s.whatsapp.net',
          ],
        }),
      }),
    },
  );
