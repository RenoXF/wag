import { logger } from '@/logger';
import { openapi } from '@elysiajs/openapi';
import { Elysia } from 'elysia';
import { version } from 'package.json';
import indexClient from './client/index.html';
import { connections } from './connections';
import { logs } from './logs';
import { messages } from './messages';

const app = new Elysia()
  .use(
    openapi({
      path: '/docs',
      documentation: {
        info: {
          title: 'WhatsApp Gateway API',
          description:
            'An API to interact with WhatsApp accounts programmatically.',
          version: version,
          license: {
            name: 'MIT',
            url: 'https://opensource.org/license/mit/',
          },
        },
      },
    }),
  )
  .use(connections)
  .use(messages)
  .use(logs)
  .get('/', indexClient, {
    detail: {
      hide: true,
    },
  })
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
