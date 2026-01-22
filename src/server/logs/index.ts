import { SessionManager } from '@/whatsapp';
import { Elysia, sse, t } from 'elysia';
import { exists } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { readeof } from 'readeof';

const manager = SessionManager.getInstance();

export const logs = new Elysia({
  prefix: '/logs',
  detail: {
    tags: ['Logs'],
    description: 'View logs for a specific WhatsApp session',
  },
})
  .get(
    '/last/:deviceId',
    async ({ params, query, set }) => {
      const { deviceId } = params;
      const lines = query.lines ?? 10;

      // Only allow log when device is registered
      const isSessionExists = manager.getSessionFromDB(deviceId);
      if (!isSessionExists) {
        set.status = 404;
        return {
          message: `Device with ID ${deviceId} is not registered.`,
        };
      }

      const cwd = process.cwd();
      const logFilePath = resolve(
        process.cwd(),
        `/logs/${deviceId}/${deviceId}.log`,
      );
      const fullLogPath = join(cwd, 'logs', deviceId, `${deviceId}.log`);

      // Security check to prevent directory traversal attacks
      if (!logFilePath.startsWith('/logs/')) {
        set.status = 404;
        return {
          message: `Log file for device ${deviceId} does not exist.`,
        };
      }

      const isExists = await exists(fullLogPath).catch(() => false);

      if (!isExists) {
        set.status = 404;
        return {
          message: `Log file for device ${deviceId} does not exist.`,
        };
      }

      const log = await readeof(fullLogPath, lines);
      const logs = log
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line));
      return {
        data: logs,
      };
    },
    {
      params: t.Object({
        deviceId: t.String({
          description: 'The ID of the WhatsApp device',
          pattern: '^[a-zA-Z0-9_\\-:@\.\|\!]+$',
        }),
      }),
      query: t.Object({
        lines: t.Optional(
          t.Nullable(
            t.Number({
              description: 'Number of log lines to fetch',
              default: 10,
              maximum: 65535,
            }),
          ),
        ),
      }),
      detail: {
        summary: 'Get Logs',
        description: 'Fetch logs for N lines of the specified device',
      },
    },
  )
  .get(
    '/sse/:deviceId',
    async function* ({ params, set }) {
      const { deviceId } = params;

      // Only allow log when device is registered
      // const isSessionExists = manager.getSessionFromDB(deviceId);
      // if (!isSessionExists) {
      //   set.status = 404;
      //   return {
      //     message: `Device with ID ${deviceId} is not registered.`,
      //   };
      // }

      const cwd = process.cwd();
      const logFilePath = resolve(
        process.cwd(),
        `/logs/${deviceId}/${deviceId}.log`,
      );
      const fullLogPath = join(cwd, 'logs', deviceId, `${deviceId}.log`);

      // Security check to prevent directory traversal attacks
      if (!logFilePath.startsWith('/logs/')) {
        set.status = 404;
        return {
          message: `Log file for device ${deviceId} does not exist.`,
        };
      }

      const isExists = await exists(fullLogPath).catch(() => false);

      if (!isExists) {
        set.status = 404;
        return {
          message: `Log file for device ${deviceId} does not exist.`,
        };
      }

      const stream = readeof(fullLogPath, 10, {
        enabled: true,
        signal: AbortSignal.timeout(30_000),
      });
      for await (const line of stream) {
        console.log('line', line);
        const logs = line
          .split('\n')
          .filter(Boolean)
          .map((ln) => JSON.parse(ln));
        yield sse(JSON.stringify({ data: logs }));
      }
    },
    {
      params: t.Object({
        deviceId: t.String({
          description: 'The ID of the WhatsApp device',
          pattern: '^[a-zA-Z0-9_\\-:@\.\|\!]+$',
        }),
      }),
      detail: {
        summary: 'Get Logs via SSE',
        description:
          'Fetch logs for the specified device using Server-Sent Events',
      },
    },
  );
