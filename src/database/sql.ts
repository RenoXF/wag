export const sql = new Bun.SQL({
  idleTimeout: 300,
  max: 5,
  connectionTimeout: 10,
});
