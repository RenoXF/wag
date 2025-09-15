import { SQL } from 'bun';

export const sql = new SQL({
	idleTimeout: 300,
	max: 10,
});

export default sql;
