import { isJidGroup, isLidUser, isPnUser } from 'baileys';
import { Elysia } from 'elysia';
import { WaStore } from '../../whatsapp';
import { MessageModel } from './model';
import { Message } from './service';
import { queue } from '../queue';
import { sendWebhook } from '../webhook';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const validateJid = (jid: string) => {
  if (!(isJidGroup(jid) || isPnUser(jid) || isLidUser(jid))) {
    throw new Error(
      'Invalid recipient JID, must be a group or user JID, like: "123456789@g.us" or "123456789@s.whatsapp.net", "123456789@lid"'
    );
  }

  if (jid.startsWith('+')) {
    throw new Error(
      'Invalid recipient JID, must not include the "+" sign. Use the format "123456789@s.whatsapp.net"'
    );
  }
}

const getWA = (deviceId: string) => {
  const whatsapp = WaStore.get(deviceId);

  if (!whatsapp) {
    throw new Error(`Device ${deviceId} not found, please connect first`);
  }

  return whatsapp;
}

const getTmpPath = () => {
  const filename = Bun.randomUUIDv7('hex');
  return resolve(tmpdir(), 'whatsapps',  filename);
}

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
    },
  )
  .post(
    '/send-text-message',
    async ({ body, set }) => {
      const whatsapp = getWA(body.deviceId);
      const jid = body.recipient;
      validateJid(jid);

      const whQueue = queue.add(body.deviceId);
      const webhookUrl = whatsapp.webhookUrl;
      const id = body.id ?? null;

      whatsapp.sendMessage(jid, {
        text: body.message,
      }).then(() => whQueue.add(() => sendWebhook({
        event: 'message_sent',
        data: {
          id,
          deviceId: body.deviceId,
          message: body.message,
          recipient: body.recipient
        }
      }, webhookUrl)))
        .catch((err) => whQueue.add(() => sendWebhook({
          event: 'message_error',
          data: {
            id,
            deviceId: body.deviceId,
            message: body.message,
            recipient: body.recipient,
            error: err?.message ?? 'Unknown error'
          }
        }, webhookUrl)))


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
    },
  )
  .post('/send-image-message', async ({ body, set }) => {
    const image = body.image;

    const tmpPath = getTmpPath();
    const tmpFile = Bun.file(tmpPath);

    await tmpFile.write(await image.arrayBuffer());
    const whatsapp = getWA(body.deviceId);
    const jid = body.recipient;
    validateJid(jid);

    const whQueue = queue.add(body.deviceId);
    const webhookUrl = whatsapp.webhookUrl;
    const id = body.id ?? null;

    whatsapp.sendMessage(jid, {
      image: {
        url: tmpPath,
      },
      caption: body.caption ?? undefined,
      fileName: body.fileName ?? image.name,
      mimetype: image.type,
    }).then(() => whQueue.add(() => sendWebhook({
      event: 'message_sent',
      data: {
        id,
        deviceId: body.deviceId,
        caption: body.caption,
        recipient: body.recipient
      }
    }, webhookUrl)))
    .catch((err) => whQueue.add(() => sendWebhook({
      event: 'message_error',
      data: {
        id,
        deviceId: body.deviceId,
        caption: body.caption,
        recipient: body.recipient,
        error: err?.message ?? 'Unknown error'
      }
    }, webhookUrl)))
    .finally(() => tmpFile.delete())


    return {
      success: true,
    };
  },
  {
    body: MessageModel.SendImageMessage,
    parse: 'multipart/form-data',
    detail: {
      summary: 'Send a image message to a specific recipient',
      description:
        'Send a image message to a specified recipient JID using the provided device ID.',
    },
  })
  .post('/send-video-message', async ({ body, set }) => {
    const video = body.video;

    const tmpPath = getTmpPath();
    const tmpFile = Bun.file(tmpPath);

    await tmpFile.write(await video.arrayBuffer());
    const whatsapp = getWA(body.deviceId);
    const jid = body.recipient;
    validateJid(jid);

    const whQueue = queue.add(body.deviceId);
    const webhookUrl = whatsapp.webhookUrl;
    const id = body.id ?? null;

    whatsapp.sendMessage(jid, {
      video: {
        url: tmpPath,
      },
      caption: body.caption ?? undefined,
      fileName: body.fileName ?? video.name,
      mimetype: video.type,
    }).then(() => whQueue.add(() => sendWebhook({
      event: 'message_sent',
      data: {
        id,
        deviceId: body.deviceId,
        caption: body.caption,
        recipient: body.recipient
      }
    }, webhookUrl)))
    .catch((err) => whQueue.add(() => sendWebhook({
      event: 'message_error',
      data: {
        id,
        deviceId: body.deviceId,
        caption: body.caption,
        recipient: body.recipient,
        error: err?.message ?? 'Unknown error'
      }
    }, webhookUrl)))
    .finally(() => tmpFile.delete())

    return {
      success: true,
    };
  },
  {
    body: MessageModel.SendVideoMessage,
    parse: 'multipart/form-data',
    detail: {
      summary: 'Send a video message to a specific recipient',
      description:
        'Send a video message to a specified recipient JID using the provided device ID.',
    },
  })
  .post('/send-document-message', async ({ body, set }) => {
    const document = body.document;

    const tmpPath = getTmpPath();
    const tmpFile = Bun.file(tmpPath);

    await tmpFile.write(await document.arrayBuffer());
    const whatsapp = getWA(body.deviceId);
    const jid = body.recipient;
    validateJid(jid);

    const whQueue = queue.add(body.deviceId);
    const webhookUrl = whatsapp.webhookUrl;
    const id = body.id ?? null;

    whatsapp.sendMessage(jid, {
      document: {
        url: tmpPath,
      },
      caption: body.caption ?? undefined,
      fileName: body.fileName ?? document.name,
      mimetype: document.type,
    }).then(() => whQueue.add(() => sendWebhook({
      event: 'message_sent',
      data: {
        id,
        deviceId: body.deviceId,
        caption: body.caption,
        recipient: body.recipient
      }
    }, webhookUrl)))
    .catch((err) => whQueue.add(() => sendWebhook({
      event: 'message_error',
      data: {
        id,
        deviceId: body.deviceId,
        caption: body.caption,
        recipient: body.recipient,
        error: err?.message ?? 'Unknown error'
      }
    }, webhookUrl)))
    .finally(() => tmpFile.delete())

    return {
      success: true,
    };
  },
  {
    body: MessageModel.SendDocumentMessage,
    parse: 'multipart/form-data',
    detail: {
      summary: 'Send a document message to a specific recipient',
      description:
        'Send a document message to a specified recipient JID using the provided device ID.',
    },
  });
