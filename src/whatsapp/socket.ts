import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  isJidBot,
  isJidMetaAI,
  isRealMessage,
  makeCacheableSignalKeyStore,
  normalizeMessageContent,
  updateMessageWithReaction,
  updateMessageWithReceipt,
  type CacheStore,
  type GroupParticipant,
  type WAConnectionState,
  type WAMessage,
  type WASocket,
} from 'baileys';
import { EventEmitter } from 'node:events';
import NodeCache from '@cacheable/node-cache';
import P from 'pino';
import { useStorage } from './storage';
import { Boom } from '@hapi/boom';
import PQueue from 'p-queue';
import { ContactTable, GroupTable, MessageTable } from '../database/models';

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

  protected _groupMetadataQueue = new PQueue({ concurrency: 1, timeout: 30 });
  protected _messageSaveQueue = new PQueue({ concurrency: 1, timeout: 30 });
  protected _contactsQueue = new PQueue({ concurrency: 1, timeout: 30 });
  protected _messageSendQueue = new PQueue({ concurrency: 1, timeout: 30 });

  constructor(public readonly deviceId: string) {
    super();
    this.logger = P({ level: 'error' }).child({ deviceId });
  }

  public async connect() {
    if (this._socket) {
      throw new Error('Socket is already connected');
    }

    const { state, saveCreds, clearCreds } = await useStorage(this.deviceId);
    // fetch latest version of WA Web
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`);

    const sock = makeWASocket({
      version,
      logger: this.logger,
      browser: Browsers.ubuntu('Chrome'),
      auth: {
        creds: state.creds,
        /** caching makes the store faster to send/recv messages */
        keys: makeCacheableSignalKeyStore(state.keys, this.logger),
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

      if (connection === 'open') {
        // we're connected
        this._auth = null;
        this._socket = sock;
        setTimeout(() => {
          this._refreshGroupMetadata();
        }, 1000)
        this.emit('ready', sock);
      }

      if (connection === 'connecting') {
        // connecting to whatsapp
        this._auth = null;
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const statusMsg = (lastDisconnect?.error as Boom)?.message ?? '';

        if (statusMsg.toLowerCase().includes('qr refs attempts ended')) {
          this._cleanup(false, statusMsg, clearCreds);
          return;
        }

        if (statusMsg.toLowerCase().includes('proxy connection timed out')) {
          console.log('Proxy connection timed out');
          this._cleanup(false, statusMsg, clearCreds);
          return;
        }

        const restartedCodes = [
          DisconnectReason.restartRequired,
          DisconnectReason.connectionLost,
          DisconnectReason.connectionClosed,
        ];

        const loggedOutCodes = [
          DisconnectReason.unavailableService,
          DisconnectReason.badSession,
          DisconnectReason.loggedOut,
          DisconnectReason.multideviceMismatch,
          406, // Banned
          402, // Temp banned
          405, // Client too old
        ];

        if (restartedCodes.includes(statusCode)) {
          console.log(
            `Connection closed, restarting (${statusCode} - ${statusMsg})`
          );
          this._cleanup(true, statusMsg);
          return this.connect().catch((err) => {
            this.emit('error', err);
          });
        }

        if (loggedOutCodes.includes(statusCode)) {
          console.log(
            `Connection closed, logged out (${statusCode} - ${statusMsg})`
          );
          this._cleanup(false, statusMsg, clearCreds);
          return;
        }

        sock.logger.info(
          {},
          `Connection closed due to ${lastDisconnect?.error}`
        );

        this._cleanup(false, statusMsg);
      }
    });

    sock.ev.on('groups.upsert', (groups) => {
      for (const group of groups) {
        this._groupMetadataQueue.add(
          () => GroupTable.upsert(group.id, this.deviceId, group),
          { id: group.id }
        );
      }
    });

    sock.ev.on('groups.update', (groups) => {
      for (const group of groups) {
        const id = group.id;

        if (!id) continue;

        this._groupMetadataQueue.add(
          () => GroupTable.upsert(id, this.deviceId, group),
          { id: id }
        );
      }
    });

    sock.ev.on('group-participants.update', ({id, participants, action}) => {
      const contacts: GroupParticipant[] = participants.map((p) => ({ id: p }));

      if (action === 'add') {
        this._groupMetadataQueue.add(
          () => GroupTable.addParticipants(id, this.deviceId, contacts),
          { id }
        );
      } else if (action === 'remove') {
        this._groupMetadataQueue.add(
          () => GroupTable.removeParticipants(id, this.deviceId, participants),
          { id }
        );
      }
    });

    sock.ev.on('messages.upsert', async ({messages, type, requestId}) => {
      for (const message of messages) {
        const id = message.key.id;
        const remoteJid = message.key.remoteJid;

        if (!id || !remoteJid) continue;

        this._messageSaveQueue.add(() => {
          return MessageTable.upsert(id, remoteJid, this.deviceId, message);
        }, { id: id });
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
          () =>  MessageTable.updateMessage(id, remoteJid, this.deviceId, message),
          { id }
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
          () =>  MessageTable.addReactions(id, remoteJid, this.deviceId, reaction),
          { id }
        );
      }
    })

    sock.ev.on('messaging-history.set', ({chats, contacts, messages}) => {
      for (const contact of contacts) {
        console.log('Saving contact from history', contact.id);
        const id = contact.id;
        if (!id) continue;

        this._contactsQueue.add(
          () =>  ContactTable.upsert(this.deviceId, contact),
          { id }
        );
      }

      for (const message of messages) {
        const id = message.key.id;
        const remoteJid = message.key.remoteJid;

        if (!id || !remoteJid) continue;

        this._messageSaveQueue.add(() => {
          return MessageTable.upsert(id, remoteJid, this.deviceId, message);
        }, { id: id });
      }
    })

    sock.ev.on('contacts.update', (contacts) => {
      for (const contact of contacts) {
        const id = contact.id;
        if (!id) continue;

        this._contactsQueue.add(
          () =>  ContactTable.update(this.deviceId, contact),
          { id: id }
        );
      }
    });

    sock.ev.on('contacts.upsert', (contacts) => {
      for (const contact of contacts) {
        this._contactsQueue.add(
          () =>  ContactTable.upsert(this.deviceId, contact),
          { id: contact.id }
        );
      }
    });
  }

  private async _refreshGroupMetadata() {
    if (!this._socket) return false;

    try {
      await this._socket.groupFetchAllParticipating();
    } catch (err) {
      console.warn('Failed to fetch group metadata', err);
      this.emit(
        'error',
        new Error('Failed to fetch group metadata', { cause: err })
      );
      return false;
    }
  }

  private _cleanup(
    isRestart: boolean = false,
    reason?: string,
    callback?: () => void
  ) {
    if (this._socket) {
      this._socket.end(new Error('Connection closed by client'));
    }
    this._socket = null;
    this._state = 'close';
    this._auth = null;

    // this.emit('state', 'close');
    this.emit('close', {
      reason: reason ?? 'Connection closed by client',
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
