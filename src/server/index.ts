import indexClient from '@/index.html';
import { logger } from '@/logger';
import { Elysia } from 'elysia';
import { connections } from './connections';
import { messages } from './messages';

const app = new Elysia()
  .use(connections)
  .use(messages)
  .get('/', indexClient)
  .listen(
    {
      port: Bun.env.PORT ? Number(Bun.env.PORT) : 3000,
      reusePort: false,
    },
    ({ hostname, port }) => {
      logger.info(`🦊 WhatsApp Gateway API is running at ${hostname}:${port}`);
    },
  );

export { app };
