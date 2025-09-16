import swagger from '@elysiajs/swagger';
import { Elysia } from 'elysia';
import pkg from '../../package.json';
import { connections } from './connections';
import { groups } from './groups';
import { messages } from './messages';
import { client } from './client';

export const server = new Elysia({})
  .use(
    swagger({
      path: '/docs',
      documentation: {
        tags: [
          {
            name: 'General',
          },
          {
            name: 'Connections',
          },
          {
            name: 'Groups',
          },
          {
            name: 'Messages',
          },
        ],
        info: {
          title: 'WAG API Documentation',
          description: 'API documentation for WAG - WhatsApp Gateway',
          version: pkg.version,
        },
      },
    })
  )
  .use(groups)
  .use(messages)
  .use(connections)
  .use(client)
  .get(
    '/status',
    () => {
      return {
        uptime: Math.floor(process.uptime()),
        timestamp: Date.now(),
        memory: Math.round(process.memoryUsage.rss() / 1024 / 1024), // in MB
        version: pkg.version,
      };
    },
    {
      tags: ['General'],
      detail: {
        summary: 'Get server status',
        description:
          'Retrieve the current status of the server including uptime, timestamp, and memory usage.',
      },
    }
  );

export type ServerType = typeof server;
