import { Elysia } from 'elysia';
import { Message } from './service';
import { MessageModel } from './model';
import { WaStore } from '../../whatsapp';
import { isJidGroup, isLidUser, isPnUser } from 'baileys';

export const messages = new Elysia({
  prefix: '/messages',
  detail: {
    summary: 'Messages Management',
    description: 'Endpoints to manage WhatsApp messages',
    tags: ['Messages'],
  },
})
  .get(
    '/',
    async ({ query }) => {
      const data = await Message.getAll(query);

      return {
        data,
      };
    },
    {
      query: MessageModel.GetAll,
      detail: {
        summary: 'Get all messages for a specific device',
        description:
          'Retrieve a list of all WhatsApp messages associated with the specified device ID. Optionally, filter by recipient JID.',
      },
    }
  )
  .post(
    '/send-text-message',
    async ({ body, set }) => {
      const whatsapp = WaStore.get(body.deviceId);

      if (!whatsapp) {
        set.status = 404;
        return {
          error: 'Device not found',
        };
      }

      const jid = body.recipient;

      if (!(isJidGroup(jid) || isPnUser(jid) || isLidUser(jid))) {
        set.status = 400;
        return {
          error:
            'Invalid recipient JID, must be a group or user JID, like: "123456789@g.us" or "123456789@s.whatsapp.net", "123456789@lid"',
        };
      }

      if (jid.startsWith('+')) {
        set.status = 400;
        return {
          error:
            'Invalid recipient JID, must not include the "+" sign. Use the format "123456789@s.whatsapp.net"',
        };
      }

      const res = await whatsapp.sendMessage(jid, {
        text: body.message,
      });

      if (!res) {
        set.status = 500;
        return {
          error: 'Failed to send message, please try again later',
        };
      }

      return {
        success: true,
      };
    },
    {
      body: MessageModel.SendTextMessage,
      detail: {
        summary: 'Send a text message to a specific recipient',
        description:
          'Send a text message to a specified recipient JID using the provided device ID.',
      },
    }
  );
