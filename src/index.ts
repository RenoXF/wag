import { runMigration, sql } from './database';
import { server } from './server';

if (sql.options.adapter !== 'postgres') {
  throw new Error('Only postgres is supported');
}

const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = process.env.PORT ? Number(process.env.PORT) : 4000;

const main = async () => {
  await runMigration();
  server.listen({ port, hostname }, (app) => {
    console.log(`Server running at http://${app.hostname}:${app.port}`);
  });
};

main();
