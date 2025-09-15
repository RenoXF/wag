import type { WAConnectionState } from 'baileys';
import PQueue from 'p-queue';
import { WaSocket, WaStore, type WhatsappAuth } from '../../whatsapp';
import type { ConnectionModel } from './model';

export type IConnection = {
	deviceId: string;
	user: {
		phoneNumber: string | null | undefined;
	} | null;
	state: WAConnectionState;
	auth: WhatsappAuth | null;
};

export abstract class Connection {
	public static async start({ deviceId, webhookUrl }: ConnectionModel.Start) {
		if (WaStore.has(deviceId)) {
			return;
		}

		const whQueue = new PQueue({ concurrency: 1 });
		const socket = new WaSocket(deviceId);

		const sendWebhook = (event: string, data: object) => {
			if (webhookUrl) {
				return fetch(webhookUrl, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						event: event,
						data: {
							deviceId,
							...data,
						},
					}),
				}).catch((err) => {
					console.error('Error sending auth webhook:', err);
				});
			}

			return Promise.resolve();
		};

		socket.on('auth', (auth) => {
			console.log('Authenticated:', auth);
			whQueue.add(() => sendWebhook('auth', { auth }));
		});

		socket.on('ready', () => {
			console.log('Socket is ready');
			whQueue.add(() => sendWebhook('ready', {}));
		});

		socket.on('state', (state) => {
			console.log('Connection state:', state);
			whQueue.add(() => sendWebhook('state', { state }));
		});

		socket.on('close', async ({ reason, isRestart }) => {
			console.log('Connection closed:', reason, isRestart);
			await whQueue.add(() => sendWebhook('close', { reason, isRestart }));
			whQueue.clear();
			await WaStore.get(deviceId)?.disconnect();

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
}
