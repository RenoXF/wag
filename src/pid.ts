import { existsSync, unlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const pidPath = resolve(tmpdir(), 'wag.pid')

export const checkPid = () => {
  if (existsSync(pidPath)) {
    console.error(`Another instance is already running, PID file exists at ${pidPath}`);
    removePid();
    process.exit(1);
  }
}

export const createPid = () => {
  writeFileSync(pidPath, process.pid.toString())
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
