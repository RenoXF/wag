import './instrument';
import { sql, db } from './database';
import { server } from './server';
import { Connection } from './server/connections/service';
import { sendWebhook } from './server/webhook';
import { WaStore } from './whatsapp';
import { traceSentry } from './instrument';

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
  await db.devices.updateAll({
    connection_state: 'close',
    qr_string: null,
    pair_code: null,
  })
  console.log('Shutting down database connection...');
  await sql.end();

  console.log(`Server closed with code: ${code}`);

  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  traceSentry(err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  traceSentry(reason);
});

const restoreDevices = async () => {
  if (Bun.env.NODE_ENV !== 'production') {
    console.log('Skipping device restoration in non-production environment');
    return;
  }
  const existingDevices = await db.devices.getAll();
  for (const row of existingDevices) {
    console.log(`Restoring device: ${row.id}`);
    await Connection.start({
      deviceId: row.id,
      webhookUrl: row.webhook_url || undefined,
      name: row.name || undefined,
      description: row.description || undefined,
      browser: row.browser || undefined,
      os: row.os || undefined,
      version: row.version || undefined,
    });

    await Bun.sleep(300);
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
