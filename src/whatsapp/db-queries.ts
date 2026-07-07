import { logger } from '@/logger';
import { BufferJSON, proto } from 'baileys';
import { Database } from 'bun:sqlite';

/**
 * Database queries class to handle all SQL operations
 * Encapsulates JSON serialization/deserialization and error handling
 */
export class DatabaseQueries {
  constructor(private db: Database) {}

  /**
   * Get group metadata from cache
   * @param key Group JID
   * @returns Parsed group metadata or undefined
   */
  getGroup(key: string): unknown {
    let query;
    try {
      query = this.db.query(
        `SELECT value FROM groups WHERE key = $key LIMIT 1`,
      );
      const row = query.get({ $key: key }) as { value: string } | undefined;

      if (row && row.value) {
        return JSON.parse(row.value, BufferJSON.reviver);
      }

      return undefined;
    } catch (error) {
      logger.error({ error, key }, '[DatabaseQueries] Error getting group');
      throw error;
    } finally {
      query?.finalize();
    }
  }

  /**
   * Get message from cache
   * @param key Message key (remoteJid-messageId)
   * @returns Parsed message object or undefined
   */
  getMessage(key: string): unknown {
    let query;
    try {
      query = this.db.query(
        `SELECT value FROM messages WHERE key = $key LIMIT 1`,
      );
      const row = query.get({ $key: key }) as { value: string } | undefined;

      if (row && row.value) {
        return JSON.parse(row.value, BufferJSON.reviver);
      }

      return undefined;
    } catch (error) {
      logger.error({ error, key }, '[DatabaseQueries] Error getting message');
      throw error;
    } finally {
      query?.finalize();
    }
  }

  /**
   * Upsert a message into the database
   * @param key Message key (remoteJid-messageId)
   * @param value Message object to store
   */
  upsertMessage(key: string, value: unknown): void {
    let query;
    try {
      const serialized = JSON.stringify(value, BufferJSON.replacer);
      query = this.db.query(
        `INSERT INTO messages (key, value) VALUES ($key, $value) ON CONFLICT(key) DO UPDATE SET value = json_patch(messages.value, EXCLUDED.value)`,
      );
      query.run({ $key: key, $value: serialized });
    } catch (error) {
      logger.error({ error, key }, '[DatabaseQueries] Error upserting message');
      throw error;
    } finally {
      query?.finalize();
    }
  }

  /**
   * Upsert a group into the database
   * @param key Group JID
   * @param value Group metadata object to store
   */
  upsertGroup(key: string, value: unknown): void {
    let query;
    try {
      const serialized = JSON.stringify(value, BufferJSON.replacer);
      query = this.db.query(
        `INSERT INTO groups (key, value) VALUES ($key, $value) ON CONFLICT(key) DO UPDATE SET value = json_patch(groups.value, EXCLUDED.value)`,
      );
      query.run({ $key: key, $value: serialized });
    } catch (error) {
      logger.error({ error, key }, '[DatabaseQueries] Error upserting group');
      throw error;
    } finally {
      query?.finalize();
    }
  }

  /**
   * Delete old messages from the database
   * @param cutoffSeconds Unix timestamp in seconds - messages older than this will be deleted
   * @returns Number of deleted rows
   */
  deleteOldMessages(cutoffSeconds: number): number {
    let query;
    try {
      query = this.db.query(`DELETE FROM messages WHERE created_at < $cutoff`);
      const result = query.run({ $cutoff: cutoffSeconds });

      if (result.changes > 0) {
        logger.info(
          `[DatabaseQueries] ${result.changes} messages deleted. Optimizing DB...`,
        );

        this.db.run('PRAGMA wal_checkpoint(TRUNCATE);');
        this.db.run('PRAGMA incremental_vacuum;');

        logger.info(`[DatabaseQueries] Optimization complete.`);
      }

      return result.changes;
    } catch (error) {
      logger.error({ error }, '[DatabaseQueries] Error deleting old messages');
      throw error;
    } finally {
      query?.finalize();
    }
  }

  /**
   * List all unique chat JIDs with their last message
   * @returns Array of chat JIDs with last message info
   */
  listChatJids(): Array<{
    chatJid: string;
    lastMessage: unknown;
    count: number;
    lastTimestamp: number;
  }> {
    let query;
    try {
      query = this.db.query(`
        SELECT
          substr(key, 1, instr(key, '-') - 1) as chatJid,
          MAX(created_at) as lastTimestamp,
          COUNT(*) as count
        FROM messages
        GROUP BY chatJid
        ORDER BY lastTimestamp DESC
      `);
      const rows = query.all() as Array<{
        chatJid: string;
        lastTimestamp: number;
        count: number;
      }>;

      return rows.map((row) => {
        const lastMsgQuery = this.db.query(
          `SELECT value FROM messages WHERE key LIKE $pattern ORDER BY created_at DESC LIMIT 1`,
        );
        const lastMsg = lastMsgQuery.get({
          $pattern: `${row.chatJid}-%`,
        }) as { value: string } | undefined;
        lastMsgQuery.finalize();

        return {
          chatJid: row.chatJid,
          lastMessage: lastMsg?.value
            ? JSON.parse(lastMsg.value, BufferJSON.reviver)
            : null,
          count: row.count,
          lastTimestamp: row.lastTimestamp,
        };
      });
    } catch (error) {
      logger.error({ error }, '[DatabaseQueries] Error listing chat JIDs');
      throw error;
    } finally {
      query?.finalize();
    }
  }

  /**
   * List messages for a specific chat JID
   * @param chatJid The chat JID to filter by
   * @param limit Maximum number of messages to return
   * @param offset Number of messages to skip
   * @returns Array of parsed message objects
   */
  listMessages(
    chatJid: string,
    limit: number = 50,
    offset: number = 0,
  ): unknown[] {
    let query;
    try {
      query = this.db.query(
        `SELECT value FROM messages WHERE key LIKE $pattern ORDER BY created_at DESC LIMIT $limit OFFSET $offset`,
      );
      const rows = query.all({
        $pattern: `${chatJid}-%`,
        $limit: limit,
        $offset: offset,
      }) as Array<{ value: string }>;

      return rows.map((row) => JSON.parse(row.value, BufferJSON.reviver));
    } catch (error) {
      logger.error(
        { error, chatJid },
        '[DatabaseQueries] Error listing messages',
      );
      throw error;
    } finally {
      query?.finalize();
    }
  }
}
