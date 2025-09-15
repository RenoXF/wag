import { SQL } from 'bun';

export const sql = new SQL({
	idleTimeout: 300,
	max: 5,
  connectionTimeout: 10,
});

try {
  await sql.connect();
} catch (error) {
  if (error instanceof Error) {
    console.error('Failed to connect to the database:', error.message);
  } else {
    console.error('Failed to connect to the database:');
  }

  process.exit(1);
}

export default sql;
