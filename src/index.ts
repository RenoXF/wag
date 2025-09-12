import { runMigration, sql } from "./database";

if (sql.options.adapter !== 'postgres') {
  throw new Error('Only postgres is supported');
}

const main = async () => {
  await runMigration();
}

main();
