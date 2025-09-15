// // API utility functions for WhatsApp Gateway

// export interface Connection {
//   deviceId: string;
//   status: string;
//   webhookUrl?: string;
// }

// export interface Group {
//   id: string;
//   name: string;
//   participantsCount: number;
// }

// export interface Message {
//   id: string;
//   recipient: string;
//   content: string;
//   timestamp: number;
//   status: string;
// }

// export interface ServerStatus {
//   uptime: number;
//   timestamp: number;
//   memory: number;
// }

import { treaty } from '@elysiajs/eden'
import type { ServerType } from '../../server'

export const client = treaty<ServerType>(document.location.origin);


class ApiClient {

  // Status API
  async getStatus() {
    return client.status.get();
  }

  // Connections API
  async getConnections() {
    return client.connections.get();
  }

  async startConnection(deviceId: string, webhookUrl?: string) {
    return client.connections.start.post({ deviceId, webhookUrl });
  }

  async stopConnection(deviceId: string) {
    return client.connections.stop.post({ deviceId });
  }

  async logoutConnection(deviceId: string) {
    return client.connections.logout.post({ deviceId });
  }

  // Groups API
  async getGroups(deviceId: string) {
    return client.groups.get({
      query: { deviceId },
    })
  }

  async refreshGroups(deviceId: string) {
    return client.groups.refresh.post({ deviceId });
  }

  // Messages API
  async getMessages(deviceId: string) {
    return client.messages.get({
      query: {
        deviceId: deviceId,
      }
    })
  }

  async sendTextMessage(deviceId: string, recipient: string, message: string) {
    return client.messages['send-text-message'].post({
      deviceId,
      recipient: recipient,
      message,
    })
  }
}

export const api = new ApiClient();
