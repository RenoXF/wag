import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { sql } from './database/sql';

const pidName = Bun.hash.xxHash3(`${sql.options.hostname}:${sql.options.port}:${sql.options.username}:${sql.options.database}`).toString(36);
const pidPath = resolve(tmpdir(), 'wag', `${pidName}.pid`);

export const checkPid = () => {
  if (existsSync(pidPath)) {
    console.error(`Another instance is already running, PID file exists at ${pidPath}.`);
    console.error(`You can run multiple instances by setting a different database connection or removing the PID file if no other instance is running.`);
    removePid();
    process.exit(1);
  }
}

export const createPid = () => {
  mkdirSync(dirname(pidPath), { recursive: true, mode: 0o755 });
  writeFileSync(pidPath, process.pid.toString(), {
    mode: 0o644,
  })
}

export const removePid = () => {
  if (existsSync(pidPath)) {
    try {
      unlinkSync(pidPath);
    } catch (err) {
      console.error('Error removing PID file:', err);
    }
  }
}

checkPid();
createPid();

process.on('SIGINT', removePid);
process.on('SIGTERM', removePid);
process.on('exit', (reason) => {
  removePid();
  process.exit(typeof reason === 'number' ? reason : 0);
});
