export const DB_PATH = Bun.env.DB_PATH || 'session_data';
export const MAX_SESSIONS = Bun.env.MAX_SESSIONS
  ? parseInt(Bun.env.MAX_SESSIONS)
  : 100;
