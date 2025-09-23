import { sql, db } from './database';
import { server } from './server';
import { sendWebhook } from './server/webhook';
import { WaSocket, WaStore } from './whatsapp';

const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = process.env.PORT ? Number(process.env.PORT) : 4000;
const shutdown = async (code: string) => {
  const store = WaStore.values();
  for (const wa of store) {
    const webhookUrl = wa.webhookUrl;
    if (!webhookUrl) {
      continue;
    }

    console.log(`Disconnecting device: ${wa.deviceId}`);
    await wa.disconnect();
    await sendWebhook(
      { event: 'close', data: { reason: 'Server closed', isRestart: false } },
      webhookUrl
    );
  }
  console.log('Shutting down database connection...');
  await sql.end();

  console.log(`Server closed with code: ${code}`);

  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const restoreDevices = async () => {
  const existingDevices = await db.sessions.getAllDeviceIds();
  for (const deviceId of existingDevices) {
    if (WaStore.has(deviceId)) {
      continue;
    }

    console.log(`Restoring device: ${deviceId}`);
    const socket = new WaSocket(deviceId);
    socket.connect();
    WaStore.set(deviceId, socket);
  }
}

const main = async () => {
  await db.runMigration();
  setTimeout(restoreDevices, 3000);
  server.listen({ port, hostname, reusePort: false }, (app) => {
    console.log(`Server running at http://${app.hostname}:${app.port}`);
  });
};

main();
