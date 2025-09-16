import type { WAConnectionState } from 'baileys';
import { WaSocket, WaStore, type WhatsappAuth } from '../../whatsapp';
import type { ConnectionModel } from './model';
import { queue } from '../queue';
import { sendWebhook } from '../webhook';

export type IConnection = {
  deviceId: string;
  user: {
    id: string | null | undefined;
    lid: string | null;
    phoneNumber: string | null;
    name: string | null;
    notify: string | null;
    verifiedName: string | null;
    imgUrl: string | null;
    status: string | null;
  } | null;
  state: WAConnectionState;
  auth: WhatsappAuth | null;
};

export abstract class Connection {
  public static async start({ deviceId, webhookUrl }: ConnectionModel.Start) {
    if (WaStore.has(deviceId)) {
      return;
    }

    const whQueue = queue.add(deviceId);
    const socket = new WaSocket(deviceId, webhookUrl);

    socket.on('auth', (auth) => {
      // console.log('Authenticated:', auth);
      whQueue.add(() => sendWebhook({
        event: 'auth',
        data: { auth }
      }, webhookUrl));
    });

    socket.on('ready', () => {
      // console.log('Socket is ready');
      whQueue.add(() => sendWebhook({ event: 'ready', data: {} }, webhookUrl));
      WaStore.set(deviceId, socket);
    });

    socket.on('state', (state) => {
      // console.log('Connection state:', state);
      whQueue.add(() => sendWebhook({ event: 'state', data: { state } }, webhookUrl));
    });

    socket.on('close', async ({ reason, isRestart }) => {
      // console.log('Connection closed:', reason, isRestart);
      if (isRestart === false) {
        await WaStore.get(deviceId)?.disconnect();
      }
      whQueue.clear();
      await sendWebhook({ event: 'close', data: { reason, isRestart } }, webhookUrl)
      WaStore.delete(deviceId);
    });

    socket.connect();

    WaStore.set(deviceId, socket);
  }

  public static has({ deviceId }: ConnectionModel.Default) {
    return WaStore.has(deviceId);
  }

  public static async stop({ deviceId }: ConnectionModel.Default) {
    if (WaStore.has(deviceId)) {
      const socket = WaStore.get(deviceId);
      await socket?.disconnect();
      WaStore.delete(deviceId);

      return true;
    }

    return false;
  }

  public static async logout({ deviceId }: ConnectionModel.Default) {
    if (WaStore.has(deviceId)) {
      const socket = WaStore.get(deviceId);
      await socket?.logout();
      WaStore.delete(deviceId);

      return true;
    }

    return false;
  }

  public static async getAll() {
    const connections: IConnection[] = [];
    for (const [deviceId, socket] of WaStore) {
      connections.push({
        deviceId: deviceId,
        user: socket.user,
        state: socket.state,
        auth: socket.auth,
      });
    }

    return connections;
  }

  public static async getInstance() {
    //
  }

  public static async getQrCode({ deviceId }: ConnectionModel.Default) {
    if (WaStore.has(deviceId)) {
      const socket = WaStore.get(deviceId);
      if (socket?.auth && socket.auth.via === 'qr_code') {
        return {
          qrCode: socket.auth.data,
          state: socket.state,
        };
      }
    }

    return null;
  }
}
