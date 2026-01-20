import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { DB_PATH } from './config';

try {
  mkdirSync(DB_PATH, { recursive: true });
} catch (e) {
  // Ignore if exists
}

export const db = new Database(`${DB_PATH}/main.sqlite`);

db.run('PRAGMA journal_mode = WAL;');
db.run('PRAGMA synchronous = NORMAL;');
db.run('PRAGMA cache_size = -1000;');
db.run('PRAGMA temp_store = MEMORY;');
db.run('PRAGMA mmap_size = 33554432;');
db.run('PRAGMA auto_vacuum = INCREMENTAL;');

db.run(`CREATE TABLE IF NOT EXISTS connections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phoneNumber TEXT,
  webhookUrl TEXT,
  qrCode TEXT,
  pairCode TEXT,
  status TEXT,
  last_connected_at INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
)`);
