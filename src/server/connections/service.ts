import type { WAConnectionState } from 'baileys';
import { WaSocket, WaStore, type WhatsappAuth, type WhatsappStats } from '../../whatsapp';
import type { ConnectionModel } from './model';
import { queue } from '../queue';
import { sendWebhook } from '../webhook';
import { DeviceTable } from '@/database/models/devices';

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
  queueInfo: {
    messageSend: number;
    messageSave: number;
    contactsSave: number;
    groupMetadataSave: number;
    groupMetadataRefresh: number;
  };
  stats: WhatsappStats
};

export abstract class Connection {
  public static async start({ deviceId, webhookUrl, name, description, browser, os, version }: ConnectionModel.Start) {
    if (WaStore.has(deviceId)) {
      return;
    }

    const whQueue = queue.add(deviceId);
    const socket = new WaSocket(deviceId, webhookUrl);

    socket.on('auth', async (auth) => {
      // console.log('Authenticated:', auth);
      if (auth.via === 'qr_code') {
        await DeviceTable.upsert(deviceId, {
          qr_string: auth.data,
          pair_code: null,
          connection_state: 'connecting'
        });
      } else if (auth.via === 'pair_code') {
        await DeviceTable.upsert(deviceId, {
          qr_string: null,
          pair_code: auth.data,
          connection_state: 'connecting'
        });
      }
      whQueue.add(() => sendWebhook({
        event: 'auth',
        data: { auth }
      }, webhookUrl));
    });

    socket.on('ready', async () => {
      await DeviceTable.upsert(deviceId, {
        qr_string: null,
        pair_code: null,
        connection_state: 'open',
      });
      whQueue.add(() => sendWebhook({ event: 'ready', data: {} }, webhookUrl));
      WaStore.set(deviceId, socket);
    });

    socket.on('state', async (state) => {
      await DeviceTable.upsert(deviceId, {
        connection_state: state,
      })
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
      await DeviceTable.upsert(deviceId, {
        connection_state: 'close',
      });
    });

    await DeviceTable.upsert(deviceId, {
      webhook_url: webhookUrl || undefined,
      name: name || undefined,
      description: description || undefined,
      browser: browser || undefined,
      os: os || undefined,
      version: version || undefined,
      connection_state: 'connecting',
    })

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
        queueInfo: socket.queueInfo,
        stats: socket.stats,
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
