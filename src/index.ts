import './db';
import { logger } from './logger';
import './shutdown';
import { SessionManager } from './whatsapp';

const manager = SessionManager.getInstance();

logger.info('🚀 WhatsApp Gateway v2 started');
logger.info(
  `📦 Loaded ${manager.getSessionCount()} active sessions from database`,
);

import('./server').catch((err) => {
  if (err instanceof Error) {
    logger.error(err.message);
  }
  logger.error('Failed to start server');

  process.exit(1);
})
