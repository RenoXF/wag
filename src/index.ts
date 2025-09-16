import { runMigration, sql } from './database';
import { server } from './server';
import { sendWebhook } from './server/webhook';
import { WaStore } from './whatsapp';

if (sql.options.adapter !== 'postgres') {
  throw new Error('Only postgres is supported');
}

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
  console.log(`Server closed with code: ${code}`);

  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const main = async () => {
  await runMigration();
  server.listen({ port, hostname, reusePort: false }, (app) => {
    console.log(`Server running at http://${app.hostname}:${app.port}`);
  });
};

main();
