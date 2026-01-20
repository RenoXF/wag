import { DB_PATH } from '@/config';
import { Boom } from '@hapi/boom';
import { E_CANCELED, Mutex } from 'async-mutex';
import {
  DisconnectReason,
  fetchLatestBaileysVersion,
  isJidBot,
  isJidBroadcast,
  isJidMetaAI,
  isJidStatusBroadcast,
  makeCacheableSignalKeyStore,
  makeWASocket,
  proto,
  type AnyMessageContent,
  type MiscMessageGenerationOptions,
  type WAConnectionState,
  type WASocket,
} from 'baileys';
import { Database } from 'bun:sqlite';
import { Cron } from 'croner';
import { randomInt } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { mkdir, rm } from 'node:fs/promises';
import P from 'pino';
import { startDbMigration } from './db-migration';
import { DatabaseQueries } from './db-queries';
import { useSqliteAuthState } from './sqlite-auth-state';
import { validatePhoneNumber } from './validate-phone-number';
import { createWhatsAppLogger } from './whatsapp-logger';

/**
 * Event map for WhatsAppSession
 */
interface WhatsAppSessionEvents {
  qr: [string];
  'pairing-code': [string];
  authenticated: [WASocket];
  'connection-close': [number | undefined];
  'session-stopped': [string];
  error: [Error];
}

/**
 * WhatsApp Session class representing a single socket connection
 * Events emitted:
 * - 'qr': (qrCode: string) - QR code received for authentication
 * - 'pairing-code': (code: string) - Pairing code received for phone authentication
 * - 'authenticated': (socket: WASocket) - Successfully authenticated and connected
 * - 'connection-close': (reason: number | undefined) - Connection closed
 * - 'session-stopped': (reason: string) - Session permanently stopped (will not auto-reconnect)
 * - 'error': (error: Error) - Error occurred
 */
export class WhatsAppSession extends EventEmitter<WhatsAppSessionEvents> {
  public readonly sessionId: string;
  public phoneNumber: string | null;
  public webhookUrl: string | null;

  private logger: P.Logger;
  private db: Database | null = null;
  private dbQueries: DatabaseQueries | null = null;
  private dbDirectory: string;
  private DEFAULT_TIMEOUT = 10;

  private socket: WASocket | null = null;
  private isLoggedIn: boolean = false;
  private qrCode: string | null = null;
  private pairingCode: string | null = null;
  private timeout: NodeJS.Timeout | undefined = undefined;

  private messageMutex = new Mutex();
  private webhookMutex = new Mutex();
  private pruneJob: Cron | null = null;

  private _connectionState: WAConnectionState = 'close';

  constructor(
    id: string,
    phoneNumber: string | null = null,
    webhookUrl: string | null = null,
  ) {
    super();

    // Validate and normalize phone number
    this.phoneNumber = phoneNumber ? validatePhoneNumber(phoneNumber) : null;
    this.sessionId = id;

    // Create logger instance with daily rotation
    this.logger = createWhatsAppLogger(this.sessionId);

    if (webhookUrl) {
      // Basic URL validation
      try {
        new URL(webhookUrl);
      } catch (error) {
        throw new Error(`Invalid webhook URL: ${webhookUrl}`);
      }
    }

    this.dbDirectory = `${DB_PATH}/${this.sessionId}`;
    this.webhookUrl = webhookUrl;
  }

  get id(): string {
    return this.sessionId;
  }

  /**
   * Get current socket instance
   */
  getSocket(): WASocket | null {
    return this.socket;
  }

  /**
   * Get current authentication status
   */
  getIsLoggedIn(): boolean {
    return this.isLoggedIn;
  }

  /**
   * Get current QR code (if available)
   */
  getQrCode(): string | null {
    return this.qrCode;
  }

  /**
   * Get current pairing code (if available)
   */
  getPairingCode(): string | null {
    return this.pairingCode;
  }

  getConnectionState(): WAConnectionState {
    return this._connectionState;
  }

  /**
   * Get session status
   */
  getStatus() {
    return {
      user: this.socket?.user || null,
      connectionState: this._connectionState,
      sessionId: this.sessionId,
      phoneNumber: this.phoneNumber,
      isLoggedIn: this.isLoggedIn,
      hasQrCode: this.qrCode !== null,
      hasPairingCode: this.pairingCode !== null,
      timeout: this.timeout ? true : false,
    };
  }

  /**
   * Connect to WhatsApp
   * @returns Promise that resolves when connection is established
   */
  async connect(
    phoneNumber: string | null = null,
    webhookUrl: string | null = null,
  ): Promise<WASocket> {
    if (this.socket) {
      this.logger.info('Socket already connected. Reusing existing connection');
      return this.socket;
    }

    if (this.db) {
      this.logger.info(
        'Database already initialized. Reusing existing connection',
      );
    }

    if (phoneNumber) {
      this.phoneNumber = validatePhoneNumber(phoneNumber);
    }

    if (webhookUrl) {
      // Basic URL validation
      try {
        new URL(webhookUrl);
        this.webhookUrl = webhookUrl;
      } catch (error) {
        throw new Error(`Invalid webhook URL: ${webhookUrl}`);
      }
    }

    this.logger.info('Starting connection process');
    this.logger.info({ status: this.getStatus() }, 'Connection status');
    await mkdir(this.dbDirectory, { recursive: true });
    const db = new Database(`${this.dbDirectory}/db.sqlite`);
    startDbMigration(db);
    this.db = db;
    const dbQueries = new DatabaseQueries(db);
    this.dbQueries = dbQueries;

    return new Promise<WASocket>(async (resolve, reject) => {
      try {
        const { state, saveCreds, clearCreds } = useSqliteAuthState(db);
        const { version, isLatest } = await fetchLatestBaileysVersion();
        this.logger.info(
          {
            version: version.join('.'),
            isLatest,
          },
          'Using WhatsApp version',
        );

        const sock = makeWASocket({
          version: version,
          logger: this.logger,
          auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, this.logger),
          },
          generateHighQualityLinkPreview: true,
          markOnlineOnConnect: false,
          syncFullHistory: false,
          shouldIgnoreJid: (jid) => {
            return (
              isJidBot(jid) ||
              isJidBroadcast(jid) ||
              isJidMetaAI(jid) ||
              isJidStatusBroadcast(jid)
            );
          },
          cachedGroupMetadata: (jid) => {
            this.logger.info({ jid }, 'Fetching cached group metadata');

            const result = dbQueries.getGroup(jid);
            return result as any;
          },
          getMessage: async (key) => {
            this.logger.info(
              {
                remoteJid: key.remoteJid,
                messageId: key.id,
              },
              'Fetching cached message',
            );

            const obj = dbQueries.getMessage(`${key.remoteJid}-${key.id}`);
            if (obj && typeof obj === 'object' && 'message' in obj) {
              return proto.Message.create(obj.message as any);
            }

            return undefined;
          },
        });

        this.socket = sock;
        this.isLoggedIn = false;

        // Handle credential updates
        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('messages.upsert', async (upsert) => {
          if (!!upsert.requestId) {
            this.logger.info(
              {
                requestId: upsert.requestId,
              },
              'Placeholder message received',
            );
          }

          this.logger.info(
            {
              type: upsert.type,
              count: upsert.messages.length,
            },
            'Messages upsert event',
          );

          if (upsert.type === 'notify') {
            for (const msg of upsert.messages) {
              if (
                msg.message?.conversation ||
                msg.message?.extendedTextMessage?.text
              ) {
                const text =
                  msg.message?.conversation ||
                  msg.message?.extendedTextMessage?.text;
                if (text == 'requestPlaceholder' && !upsert.requestId) {
                  const messageId = await sock.requestPlaceholderResend(
                    msg.key,
                  );
                  this.logger.info(
                    { messageId },
                    'Requested placeholder resync',
                  );
                }

                // go to an old chat and send this
                if (text == 'onDemandHistSync') {
                  const messageId = await sock.fetchMessageHistory(
                    50,
                    msg.key,
                    msg.messageTimestamp!,
                  );
                  this.logger.info({ messageId }, 'Requested on-demand sync');
                }
              }

              if (msg.key.id && msg.key.remoteJid) {
                dbQueries.upsertMessage(
                  `${msg.key.remoteJid}-${msg.key.id}`,
                  msg,
                );
              }
            }
          }
        });

        sock.ev.on('messages.update', (updates) => {
          this.logger.info({ count: updates.length }, 'Messages update event');

          for (const msg of updates) {
            if (msg.key.id && msg.key.remoteJid) {
              dbQueries.upsertMessage(
                `${msg.key.remoteJid}-${msg.key.id}`,
                msg.update,
              );
            }
          }
        });

        sock.ev.on('groups.upsert', (groups) => {
          this.logger.info({ count: groups.length }, 'Groups upsert event');
          for (const group of groups) {
            dbQueries.upsertGroup(group.id, group);
          }
        });

        sock.ev.on('groups.update', async (updates) => {
          this.logger.info({ count: updates.length }, 'Groups update event');

          for (const group of updates) {
            if (!group.id) continue; // skip if no id
            const data = await sock.groupMetadata(group.id).catch(() => null);
            dbQueries.upsertGroup(group.id, data);
          }
        });

        sock.ev.on('group-participants.update', async (group) => {
          this.logger.info(
            {
              groupId: group.id,
              action: group.action,
              participantsCount: group.participants.length,
            },
            'Group participants update event',
          );

          const data = await sock.groupMetadata(group.id).catch(() => null);
          dbQueries.upsertGroup(group.id, data);
        });

        sock.ev.on('messaging-history.set', (updates) => {
          const { messages } = updates;
          this.logger.info(
            {
              messagesCount: messages.length,
            },
            'Messaging history set event',
          );

          for (const msg of messages) {
            dbQueries.upsertMessage(`${msg.key.remoteJid}-${msg.key.id}`, msg);
          }
        });

        // Handle connection updates
        sock.ev.on('connection.update', async (update) => {
          const { connection, lastDisconnect, qr } = update;

          if (qr) {
            this.logger.info({ qr }, 'QR code received');
            this.qrCode = qr;
            this.emit('qr', qr);
            this.sendWebhook('auth', {
              via: 'qr_code',
              data: qr,
            });

            this.logger.info(
              {
                registered: sock.authState.creds.registered,
              },
              'Registration status',
            );
            this.logger.info(
              {
                phoneNumber: this.phoneNumber,
              },
              'Phone number for pairing',
            );

            if (!sock.authState.creds.registered && this.phoneNumber) {
              try {
                const code = await sock.requestPairingCode(this.phoneNumber);
                this.logger.info({ code }, 'Pairing code generated');
                this.pairingCode = code;
                this.emit('pairing-code', code);
                this.sendWebhook('auth', {
                  via: 'pair_code',
                  data: code,
                });
              } catch (error) {
                this.logger.error({ error }, 'Failed to request pairing code');
                this.emit(
                  'error',
                  error instanceof Error ? error : new Error(String(error)),
                );
              }
            }
          }

          if (connection === 'close') {
            const statusCode = (lastDisconnect?.error as Boom)?.output
              ?.statusCode;
            this.logger.info({ statusCode }, 'Connection closed');

            this.emit('connection-close', statusCode);

            switch (statusCode) {
              case DisconnectReason.unavailableService:
                this.logger.info(
                  { reason: 'unavailableService' },
                  'WhatsApp service unavailable, reconnecting',
                );
                this.cleanup();
                this.emit('session-stopped', 'unavailableService');
                this.sendWebhook('close', {
                  reason: 'WhatsApp Service is Unavailable, reconnecting...',
                  isRestart: true,
                });
                this.connect().catch((err) => this.emit('error', err));
                break;

              case DisconnectReason.forbidden:
                this.logger.info(
                  { reason: 'forbidden' },
                  'Connection forbidden, invalid credentials',
                );
                await this.disconnect();
                this.emit('session-stopped', 'forbidden');
                this.sendWebhook('close', {
                  reason: 'Connection Forbidden, invalid credentials.',
                  isRestart: false,
                });
                break;

              case DisconnectReason.badSession:
                this.logger.info(
                  { reason: 'badSession' },
                  'Bad session file, delete and scan again',
                );
                this.cleanup();
                clearCreds();
                this.emit('session-stopped', 'badSession');
                this.sendWebhook('close', {
                  reason:
                    'Bad Session File, Please Delete Session and Scan Again',
                  isRestart: false,
                });
                break;

              case DisconnectReason.connectionClosed:
                this.logger.info(
                  { reason: 'connectionClosed' },
                  'Connection closed, reconnecting',
                );
                if (!this.isLoggedIn || this.pairingCode) {
                  clearCreds();
                }
                this.cleanup();

                this.emit('session-stopped', 'connectionClosed');
                this.sendWebhook('close', {
                  reason: 'Connection closed, reconnecting....',
                  isRestart: true,
                });
                this.connect().catch((err) => this.emit('error', err));
                break;

              case DisconnectReason.connectionLost:
                this.logger.info(
                  { reason: 'connectionLost' },
                  'Connection lost from server, reconnecting',
                );
                if (this.pairingCode) {
                  clearCreds();
                }
                this.cleanup();

                this.connect().catch((err) => this.emit('error', err));
                this.emit('session-stopped', 'connectionLost');
                this.sendWebhook('close', {
                  reason: 'Connection Lost from Server, reconnecting...',
                  isRestart: true,
                });
                break;

              case DisconnectReason.connectionReplaced:
                this.logger.info(
                  { reason: 'connectionReplaced' },
                  'Connection replaced, another session opened',
                );
                this.cleanup();
                clearCreds();
                this.emit('session-stopped', 'connectionReplaced');
                this.sendWebhook('close', {
                  reason:
                    'Connection Replaced, Another New Session Opened, Please Close Current Session First',
                  isRestart: false,
                });
                break;

              case DisconnectReason.loggedOut:
                this.logger.info(
                  { reason: 'loggedOut' },
                  'Device logged out, scan again',
                );
                this.qrCode = null;
                this.pairingCode = null;
                this.isLoggedIn = false;
                this.socket = null;
                clearCreds();
                this.destroy();
                this.emit('session-stopped', 'loggedOut');
                this.sendWebhook('close', {
                  reason: 'Device Logged Out, Please Scan Again And Run.',
                  isRestart: false,
                });
                break;

              case DisconnectReason.restartRequired:
                this.logger.info(
                  { reason: 'restartRequired' },
                  'Restart required, restarting',
                );
                this.cleanup();
                clearTimeout(this.timeout);
                this.emit('session-stopped', 'restartRequired');

                this.sendWebhook('close', {
                  reason: 'Restart Required, Restarting...',
                  isRestart: true,
                });
                this.connect().catch((err) => this.emit('error', err));
                break;

              case DisconnectReason.multideviceMismatch:
                this.logger.info(
                  {
                    reason: 'multideviceMismatch',
                  },
                  'Multi-device mismatch, scan again',
                );
                this.cleanup();
                clearCreds();
                this.emit('session-stopped', 'multideviceMismatch');
                this.sendWebhook('close', {
                  reason: 'Multi-device Mismatch, Please Scan Again And Run.',
                  isRestart: false,
                });
                break;

              // Disconnected by user
              case 998:
                this.logger.info(
                  {
                    reason: 'disconnectedByUser',
                  },
                  'Session disconnected by user',
                );
                this.cleanup();
                this.emit('session-stopped', 'disconnectedByUser');
                this.sendWebhook('close', {
                  reason: 'Session disconnected by user.',
                  isRestart: false,
                });
                break;

              // Timeout
              case 999:
                this.logger.info(
                  { reason: 'timeout' },
                  'Process timeout reached',
                );
                if (this.pairingCode && !this.isLoggedIn) {
                  this.logger.info(
                    'Pairing code exists, clearing session for reconnection',
                  );
                  clearCreds();
                }
                this.cleanup();
                this.emit('session-stopped', 'timeout');
                this.sendWebhook('close', {
                  reason: 'Process timeout reached.',
                  isRestart: false,
                });
                break;

              default:
                this.logger.info(
                  {
                    statusCode,
                    errorMessage: lastDisconnect?.error?.message,
                    reason: 'unknown',
                  },
                  'Unknown disconnect reason, reconnecting',
                );
                this.cleanup();
                // clearCreds();
                this.emit('session-stopped', 'unknown');
                this.sendWebhook('close', {
                  reason: 'Unknown DisconnectReason, reconnecting...',
                  isRestart: true,
                });
                this.connect().catch((err) => this.emit('error', err));
            }
          } else if (connection === 'open') {
            clearTimeout(this.timeout);
            this.timeout = undefined;
            this.logger.info('Connection opened successfully');
            this.isLoggedIn = true;
            this.socket = sock;
            this.qrCode = null;
            this.pairingCode = null;
            this.logger.info('Connected to WhatsApp');

            this.emit('authenticated', sock);
            this.sendWebhook('ready', {
              event: 'ready',
              data: {},
            });

            this.pruneJob = new Cron('0 0 * * *', () => {
              this.pruneOldMessages(30);
            });
            return resolve(sock);
          } else if (connection === 'connecting') {
            this.qrCode = null;
            this.pairingCode = null;
            this.logger.info('Connecting to WhatsApp');
          }

          if (connection) {
            this._connectionState = connection;
            this.sendWebhook('state', {
              data: { state },
            });
          }
        });

        // Set timeout for inactivity
        if (this.timeout) {
          this.logger.info('Timeout already set');
        } else {
          this.logger.info(
            {
              timeoutMinutes: this.DEFAULT_TIMEOUT,
            },
            'Setting inactivity timeout',
          );
          this.timeout = setTimeout(
            () => {
              this.logger.info('No activity detected, exiting');
              if (this.socket) {
                this.socket.end(
                  new Boom('Process timeout reached', { statusCode: 999 }),
                );
                this.socket = null;
              }
              this.isLoggedIn = false;
              this.qrCode = null;
              this.pairingCode = null;
              this.logger.info('Process exited due to inactivity');
            },
            1000 * 60 * this.DEFAULT_TIMEOUT,
          );
        }
      } catch (error) {
        this.logger.error({ error }, 'Error during connection');
        const err = error instanceof Error ? error : new Error(String(error));
        this.emit('error', err);
        reject(err);
      }
    });
  }

  /**
   * Disconnect and cleanup session
   */
  async disconnect(): Promise<void> {
    clearTimeout(this.timeout);
    if (this.socket) {
      this.socket.end(
        new Boom('Session disconnected by user', { statusCode: 998 }),
      );
      this.socket = null;
    }
    this.cleanup();
  }

  private cleanup() {
    this.socket = null;
    this.isLoggedIn = false;
    this.qrCode = null;
    this.pairingCode = null;
    this.db?.close();
    this.db = null;
    this.dbQueries = null;
    this.pruneJob?.stop();
    this.pruneJob = null;
    this.messageMutex.cancel();
    this._connectionState = 'close';
  }

  async logout(): Promise<void> {
    if (this.socket) {
      await this.socket.logout('User logged out').catch((err) => {
        this.logger.error({ err }, 'Error during logout');
      });
      this.socket = null;
    }
    this.cleanup();
  }

  /**
   * Destroy session (disconnect and remove auth data)
   */
  async destroy(): Promise<void> {
    await this.disconnect();
    await rm(this.dbDirectory, { force: true, recursive: true });
  }

  /**
   * Send a message to Whatsapp contact
   *
   * @param id Message ID
   * @param jid JID of the contact
   * @param content Message content
   * @param options Misc message generation options
   */
  async sendMessage(
    id: string,
    jid: string,
    content: AnyMessageContent,
    options: MiscMessageGenerationOptions | undefined = undefined,
  ) {
    const send = async () => {
      if (!this.socket) {
        throw new Error(`[${this.sessionId}] Socket not connected`);
      }

      await this.socket
        .presenceSubscribe(jid)
        .catch((r) =>
          this.logger.error({ error: r }, 'presenceSubscribe error'),
        );
      await Bun.sleep(randomInt(10, 15) * 100);
      await this.socket
        .sendPresenceUpdate('available', jid)
        .catch((r) =>
          this.logger.error({ error: r }, 'sendPresenceUpdate available error'),
        );
      await Bun.sleep(randomInt(10, 15) * 100);
      await this.socket
        .sendPresenceUpdate('composing', jid)
        .catch((r) =>
          this.logger.error({ error: r }, 'sendPresenceUpdate composing error'),
        );
      await Bun.sleep(randomInt(10, 15) * 100);
      await this.socket
        .sendPresenceUpdate('paused', jid)
        .catch((r) =>
          this.logger.error({ error: r }, 'sendPresenceUpdate paused error'),
        );
      await Bun.sleep(randomInt(10, 15) * 100);

      await this.socket
        .sendMessage(jid, content, options ?? undefined)
        .catch((r) => {
          throw new Error(`[${this.sessionId}] sendMessage error: ${r}`);
        });

      await Bun.sleep(randomInt(160, 190) * 1000);
    };

    this.messageMutex
      .runExclusive(send)
      .catch((err) => {
        this.logger.error({ err }, 'Send message mutex error');
        if ((err = E_CANCELED)) {
          this.logger.error('Message sending cancelled');
          return;
        }

        this.sendWebhook('message_error', {
          id,
          deviceId: this.sessionId,
          message: (content as any).text ?? '',
          recipient: jid,
          error: err instanceof Error ? err.message : String(err),
        });
      })
      .then(() => {
        this.sendWebhook('message_sent', {
          id,
          deviceId: this.sessionId,
          message: (content as any).text ?? '',
          recipient: jid,
        });
      });
  }

  /**
   * Prune old messages from the database
   * @param olderThanDays Number of days to keep messages. Messages older than this will be deleted. Default is 30 days.
   */
  pruneOldMessages(olderThanDays: number = 30): void {
    if (!this.dbQueries) {
      this.logger.warn('Database not initialized, cannot prune messages');
      return;
    }

    const cutoffTimestamp = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    const cutoffSeconds = Math.floor(cutoffTimestamp / 1000);

    const deletedCount = this.dbQueries.deleteOldMessages(cutoffSeconds);

    this.logger.info(
      {
        deletedCount,
        olderThanDays,
      },
      'Pruned old messages',
    );
  }

  /**
   * Send webhook notification
   *
   * @param event Event name
   * @param data Event data
   */
  private sendWebhook(event: string, data: any): void {
    this.webhookMutex.runExclusive(async () => {
      if (!this.webhookUrl) return;

      try {
        const response = await fetch(this.webhookUrl, {
          method: 'POST',
          signal: AbortSignal.timeout(10_000),
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': `WAG-WhatsAppSession/${this.sessionId}`,
            'X-Session-ID': this.sessionId,
            'X-Event': event,
            'X-Timestamp': new Date().toISOString(),
          },
          body: JSON.stringify({ event, data }),
        });

        if (!response.ok) {
          this.logger.error(
            {
              status: response.status,
              statusText: response.statusText,
            },
            'Webhook POST failed',
          );
        }
      } catch (error) {
        this.logger.error({ error }, 'Error sending webhook');
      }
    });
  }
}
