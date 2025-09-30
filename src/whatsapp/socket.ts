import { randomInt } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { NodeCache } from '@cacheable/node-cache';
import type { Boom } from '@hapi/boom';
import makeWASocket, {
	type AnyMessageContent,
	Browsers,
	type CacheStore,
	DisconnectReason,
	fetchLatestBaileysVersion,
	type GroupParticipant,
	isJidBot,
	isJidMetaAI,
	isPnUser,
	jidDecode,
	jidNormalizedUser,
	type MiscMessageGenerationOptions,
	makeCacheableSignalKeyStore,
	type WAConnectionState,
	type WASocket,
  proto,
} from 'baileys';
import { sleep } from 'bun';
import PQueue from 'p-queue';
import P from 'pino';
import { ContactTable, GroupTable, MessageTable } from '../database/models';
import { useStorage } from './storage';
import { version } from '../../package.json'
import { sentryDsn, traceSentry } from '@/instrument';

export type WhatsappAuth = {
	via: 'qr_code' | 'pair_code';
	data: string;
};

export interface WhatsappEvent {
	state: [WAConnectionState];
	auth: [WhatsappAuth];
	ready: [WASocket];
	close: [{ reason: string; isRestart: boolean }];
	error: [Error];
}

export class WaSocket extends EventEmitter<WhatsappEvent> {
	protected logger: P.Logger;
	protected _state: WAConnectionState = 'close';
	protected _auth: WhatsappAuth | null = null;
	protected _socket: WASocket | null = null;

	protected _msgRetryCounterCache = new NodeCache({
		stdTTL: 60 * 60, // 1 hour
	}) as CacheStore;
	protected _userDevicesCache = new NodeCache({
		stdTTL: 60 * 60, // 1 hour
	}) as CacheStore;
	protected _placeholderResendCache = new NodeCache({
		stdTTL: 60 * 60, // 1 hour
	}) as CacheStore;
  protected _sessionCache = new NodeCache({
    stdTTL: 5 * 60, // 5 minutes
    useClones: false,
  }) as CacheStore
  protected _retriesCount = 0;

	protected _groupMetadataQueue = new PQueue({ concurrency: 1, timeout: 30 });
	protected _messageSaveQueue = new PQueue({ concurrency: 1, timeout: 30 });
	protected _contactsQueue = new PQueue({ concurrency: 1, timeout: 30 });
	protected _messageSendQueue = new PQueue({ concurrency: 1 });
	protected _groupMetadataRefreshQueue = new PQueue({
		concurrency: 1,
		interval: 60_000,
		intervalCap: 1,
	});

	constructor(public readonly deviceId: string, public readonly webhookUrl?: string | null) {
		super();
    const sentryOpts = {};
    if (sentryDsn) {
      Object.assign(sentryOpts, {
        sentry: {
          dsn: sentryDsn,
        },
        minLevel: 40,
      })
    }
		this.logger = P({
      ...sentryOpts,
      level: process.env.NODE_ENV === 'production' ? 'error' : 'trace',
      formatters: {
        log(object) {
          const date = new Intl.DateTimeFormat('sv-SE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: 'Asia/Jakarta',
          }).format(new Date());
          return { ...object, date };
        },
      },
    }).child({
      deviceId,
      version: version,
    });
	}

	public get user() {
		if (this._socket?.user) {
			const phoneNumber = isPnUser(this._socket.user.id)
				? jidDecode(jidNormalizedUser(this._socket.user.id))?.user
				: null;
			return {
				id: phoneNumber,
				lid: this._socket.user.lid ?? null,
				phoneNumber: this._socket.user.phoneNumber ?? null,
				name: this._socket.user.name ?? null,
				notify: this._socket.user.notify ?? null,
				verifiedName: this._socket.user.verifiedName ?? null,
				imgUrl: this._socket.user.imgUrl ?? null,
				status: this._socket.user.status ?? null,
			};
		}

		return null;
	}

	public get state() {
		return this._state;
	}

	public get auth() {
		return this._auth;
	}

  public get queueInfo() {
    return {
      messageSend: this._messageSendQueue.size,
      messageSave: this._messageSaveQueue.size,
      contactsSave: this._contactsQueue.size,
      groupMetadataSave: this._groupMetadataQueue.size,
      groupMetadataRefresh: this._groupMetadataRefreshQueue.size,
    }
  }

	public async connect() {
		if (this._socket) {
			throw new Error('Socket is already connected');
		}

    if (this._retriesCount > 0) {
      await Bun.sleep(1000);
    }

		const { state, saveCreds, clearCreds } = await useStorage(this.deviceId);

    if (this._retriesCount >= 15) {
      this._cleanup(false, 'Maximum retries reached, cleared credentials', clearCreds);
      return;
    }

    this._sessionCache.flushAll();

		// fetch latest version of WA Web
		// const { version, isLatest } = await fetchLatestBaileysVersion();
		// console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`);

		const sock = makeWASocket({
			// version,
			logger: this.logger,
			browser: Browsers.ubuntu('Chrome'),
			auth: {
				creds: state.creds,
				/** caching makes the store faster to send/recv messages */
				keys: makeCacheableSignalKeyStore(state.keys, this.logger, this._sessionCache),
			},
			generateHighQualityLinkPreview: true,
			markOnlineOnConnect: false,
			msgRetryCounterCache: this._msgRetryCounterCache,
			userDevicesCache: this._userDevicesCache,
			placeholderResendCache: this._placeholderResendCache,
			shouldIgnoreJid: (jid) => {
				return isJidBot(jid) || isJidMetaAI(jid);
			},
			cachedGroupMetadata: async (jid) => {
				const group = await GroupTable.get(jid, this.deviceId);
				if (group) {
					return group;
				}
			},
			getMessage: async (key) => {
				const id = key.id;
				const remoteJid = key.remoteJid;

				if (!id || !remoteJid) return undefined;
				const msg = await MessageTable.get(id, remoteJid, this.deviceId);

				if (msg?.message) {
					return msg.message;
				}
			},
		});

		sock.ev.on('creds.update', saveCreds);

		sock.ev.on('connection.update', (update) => {
			const { connection, lastDisconnect, qr } = update;

			if (qr) {
				this._auth = { via: 'qr_code', data: qr };
				this.emit('auth', this._auth);
			}

			if (connection) {
				this._state = connection;
				this.emit('state', connection);
			}

			if (connection === 'connecting') {
				this._socket = sock;
			}

			if (connection === 'close') {
				const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
				const statusMsg = ((lastDisconnect?.error as Boom)?.message ?? '').toLowerCase();

				if (statusMsg.includes('qr refs attempts ended')) {
          console.log('QR attempts ended');
					this._cleanup(false, statusMsg, clearCreds);
					return;
				}

				if (statusMsg.includes('proxy connection timed out')) {
					console.log('Proxy connection timed out');
					this._cleanup(false, statusMsg, clearCreds);
					return;
				}

        if (statusMsg.includes('websocket error') && statusMsg.includes('failed to connect')) {
          console.log('Failed to connect to whatsapp websocket,')

          return Bun.sleep(3000).then(() => {
            this._cleanup(true, statusMsg);
            return this.connect().catch((err) => {
              this.emit('error', err);
            });
          });
        }

				const restartedCodes = [
					DisconnectReason.restartRequired,
					DisconnectReason.connectionLost,
          DisconnectReason.connectionClosed,
          DisconnectReason.unavailableService,
          DisconnectReason.connectionReplaced,
          DisconnectReason.timedOut,
          DisconnectReason.badSession,
				];

				const loggedOutCodes = [
					// DisconnectReason.badSession,
					DisconnectReason.loggedOut,
					DisconnectReason.multideviceMismatch,
          DisconnectReason.forbidden,
					406, // Banned
					402, // Temp banned
					405, // Client too old
				];

				if (restartedCodes.includes(statusCode)) {
					console.log(
						`Connection closed, restarting (${statusCode} - ${statusMsg})`,
					);
					this._cleanup(true, statusMsg);
          this._retriesCount++;
					return this.connect().catch((err) => {
						this.emit('error', err);
					});
				}

				if (loggedOutCodes.includes(statusCode)) {
					console.log(
						`Connection closed, logged out (${statusCode} - ${statusMsg})`,
					);
					this._cleanup(false, statusMsg, clearCreds);
					return;
				}

				console.log(`Connection closed due to ${lastDisconnect?.error}`);

				this._cleanup(false, statusMsg);
			}

			if (connection === 'open') {
				// we're connected
				this._auth = null;
				this._socket = sock;
        this._retriesCount = 0;
        setTimeout(() => {
          if (this._socket) {
            this._socket.sendPresenceUpdate('available')
              .catch((err) => {
                traceSentry(err, {
                  data: {
                    presence: 'available',
                  },
                });
                console.error('Failed to send initial presence update:', err);
              });
          }
        }, 1000);
        setTimeout(() => {
					this.refreshGroupMetadata();
				}, 3000);
				this.emit('ready', sock);
			}
		});

		sock.ev.on('groups.upsert', (groups) => {
			for (const group of groups) {
				this._groupMetadataQueue.add(
					() => GroupTable.upsert(group.id, this.deviceId, group),
					{ id: group.id },
				);
			}
		});

		sock.ev.on('groups.update', (groups) => {
			for (const group of groups) {
				const id = group.id;

				if (!id) continue;

				this._groupMetadataQueue.add(
					() => GroupTable.upsert(id, this.deviceId, group),
					{ id: id },
				);
			}
		});

		sock.ev.on('group-participants.update', ({ id, participants, action }) => {
			const contacts: GroupParticipant[] = participants.map((p) => ({ id: p }));

			if (action === 'add') {
				this._groupMetadataQueue.add(
					() => GroupTable.addParticipants(id, this.deviceId, contacts),
					{ id },
				);
			} else if (action === 'remove') {
				this._groupMetadataQueue.add(
					() => GroupTable.removeParticipants(id, this.deviceId, participants),
					{ id },
				);
			}
		});

		sock.ev.on('messages.upsert', async ({ messages }) => {
			for (const message of messages) {
				const id = message.key.id;
				const remoteJid = message.key.remoteJid;

				if (!id || !remoteJid) continue;

				this._messageSaveQueue.add(
					() => {
						return MessageTable.upsert(id, remoteJid, this.deviceId, message);
					},
					{ id: id },
				);
			}
		});

		sock.ev.on('messages.update', (messages) => {
			for (const data of messages) {
				const id = data.key.id;
				const remoteJid = data.key.remoteJid;

				if (!id || !remoteJid) continue;
				const message = data.update;
				if (!message) continue;

				this._messageSaveQueue.add(
					() =>
						MessageTable.updateMessage(id, remoteJid, this.deviceId, message),
					{ id },
				);
			}
		});

		sock.ev.on('messages.reaction', (reactions) => {
			for (const data of reactions) {
				const id = data.key.id;
				const remoteJid = data.key.remoteJid;
				const reaction = data.reaction;

				if (!id || !remoteJid) continue;
				if (!reaction) continue;

				this._messageSaveQueue.add(
					() =>
						MessageTable.addReactions(id, remoteJid, this.deviceId, reaction),
					{ id },
				);
			}
		});

		sock.ev.on('messaging-history.set', ({ contacts, messages }) => {
			for (const contact of contacts) {
				// console.log('Saving contact from history', contact.id);
				const id = contact.id;
				if (!id) continue;

				this._contactsQueue.add(
					() => ContactTable.upsert(this.deviceId, contact),
					{ id },
				);
			}

			for (const message of messages) {
				const id = message.key.id;
				const remoteJid = message.key.remoteJid;

				if (!id || !remoteJid) continue;

				this._messageSaveQueue.add(
					() => {
						return MessageTable.upsert(id, remoteJid, this.deviceId, message);
					},
					{ id: id },
				);
			}
		});

		sock.ev.on('contacts.update', (contacts) => {
			for (const contact of contacts) {
				const id = contact.id;
				if (!id) continue;

				this._contactsQueue.add(
					() => ContactTable.update(this.deviceId, contact),
					{ id: id },
				);
			}
		});

		sock.ev.on('contacts.upsert', (contacts) => {
			for (const contact of contacts) {
				this._contactsQueue.add(
					() => ContactTable.upsert(this.deviceId, contact),
					{ id: contact.id },
				);
			}
		});
	}

	public async disconnect() {
		if (this._socket) {
			this._socket.end(new Error('Connection closed by client, disconnect called'));
		}
	}

	public async logout() {
		if (this._socket) {
			await this._socket.logout();
		} else {
      // console.log('Socket is not connected, nothing to logout');
			this._cleanup(false, 'Connection closed by client, logout called');
		}
	}

	public async sendMessage(
		jid: string,
		content: AnyMessageContent,
		options?: MiscMessageGenerationOptions,
	): Promise<proto.WebMessageInfo | void> {
		const socket = this._socket;
		if (!socket) {
			return Promise.reject('Socket is not connected');
		}

		return await this._messageSendQueue.add(
			async () => {
				try {
					await socket.presenceSubscribe(jid);
					await socket.sendPresenceUpdate('available', jid);

					await sleep(1000 * randomInt(1, 3));

					const text = (content as any).caption ?? (content as any).text ?? '';
					const typingSpeed = randomInt(25, 30);
					const typingDurationSec = Math.max(
						1,
						Math.ceil(text.length / typingSpeed),
					);
					const intervalSec = 2;
					const iterations = Math.ceil(typingDurationSec / intervalSec);

					for (let i = 0; i < iterations; i++) {
						await socket.sendPresenceUpdate('composing', jid);
						await Bun.sleep(randomInt(3, 8) * 100);
					}

					await socket.sendPresenceUpdate('available', jid);
					const res = await socket.sendMessage(jid, content, options);

					if (res) {
						return Promise.resolve(res);
					}
          return Promise.reject('Failed to send message: Unknown error');
				} catch (error) {
          traceSentry(error, {
            data: {
              jid: jid,
              content,
              options,
            },
          });
					return Promise.reject(`Failed to send message: ${error}`);
				}
			},
		);
	}

	public async refreshGroupMetadata() {
		if (!this._socket) return false;

		this._groupMetadataRefreshQueue.add(async () => {
			try {
				await this._socket?.groupFetchAllParticipating();

				return true;
			} catch (err) {
				console.warn('Failed to fetch group metadata', err);
				this.emit(
					'error',
					new Error('Failed to fetch group metadata', { cause: err }),
				);
        traceSentry(err);
				return false;
			}
		});

		return true;
	}

	private _cleanup(
		isRestart: boolean = false,
		reason?: string,
		callback?: () => void,
	) {
    if (isRestart === false) {
      if (this._socket) {
        // console.log('Cleaning up socket', isRestart ? 'for restart' : 'not for restart');
        this._socket.end(new Error('Connection closed by client, cleanup called'));
      } else {
        this.emit('state', 'close');
      }
    }
		this._socket = null;
		this._state = 'close';
		this._auth = null;

		this.emit('close', {
			reason: reason ?? 'Connection closed by client, cleanup with no reason',
			isRestart,
		});

		if (!isRestart) {
			this._msgRetryCounterCache.flushAll();
			this._userDevicesCache.flushAll();
			this._placeholderResendCache.flushAll();
			this._groupMetadataQueue.clear();
			this._messageSaveQueue.clear();
			this._messageSendQueue.clear();
			this._contactsQueue.clear();
		}

		if (callback) {
			callback();
		}
	}
}
