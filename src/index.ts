import './db';
import { logger } from './logger';
import './server'; // This will start the server
import './shutdown';
import { SessionManager } from './whatsapp';

const manager = SessionManager.getInstance();

logger.info('🚀 WhatsApp Gateway v2 started');
logger.info(
  `📦 Loaded ${manager.getSessionCount()} active sessions from database`,
);
