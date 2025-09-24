import { SQL } from 'bun';
import { PostgresDatabaseService } from './repositories/postgres/service';
import { traceSentry } from '@/instrument';

export const sql = new SQL({
  idleTimeout: 300,
  max: 5,
  connectionTimeout: 10,
});

try {
  await sql.connect();
} catch (error) {
  traceSentry(error);
  if (error instanceof Error) {
    console.error('Failed to connect to the database:', error.message);
  } else {
    console.error('Failed to connect to the database:');
  }

  process.exit(1);
}

const createDatabaseService = () => {
  if (sql.options.adapter === 'postgres') {
    return new PostgresDatabaseService(sql);
  } else {
    console.error(`Unsupported database adapter: ${sql.options.adapter}`);
    process.exit(1);
  }
}

export const db = createDatabaseService();
export default sql;
