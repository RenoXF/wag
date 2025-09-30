import { PostgresDatabaseService } from './repositories/postgres/service';
import { traceSentry } from '@/instrument';
import { sql } from './sql';

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
