import { SessionManager } from '@/whatsapp';
import { isJidGroup, isLidUser, isPnUser } from 'baileys';
import { Elysia, t } from 'elysia';

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
    tags: ['messages'],
    description: 'Endpoints to manage messages',
  },
}).post(
  '/send-text-message',
  ({ body, set }) => {
    const whatsapp = getWA(body.deviceId);
    const jid = body.recipient;
    validateJid(jid);

    const id = body.id ?? null;

    whatsapp.sendMessage(id ?? Bun.randomUUIDv7(), jid, { text: body.message });

    return {
      success: true,
    };
  },
  {
    body: t.Object({
      deviceId: t.String({
        minLength: 1,
      }),
      id: t.Optional(t.Nullable(t.String())),
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
