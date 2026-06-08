/**
 * src/index.js — backend entry point.
 *
 * Responsibilities (boot order matters):
 *   1. Load env (.env in dev, real env in prod)
 *   2. Build Express app + attach middleware
 *   3. Wire REST routes
 *   4. Create HTTP server, attach Socket.io
 *   5. Wire socket handlers
 *   6. Listen
 *
 * Graceful shutdown closes Redis + Prisma so the process can
 * exit cleanly under SIGTERM (Fly.io / docker stop).
 */

import 'dotenv/config';
import http from 'node:http';
import { createApp } from './app.js';
import { createSocketServer } from './socket/index.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { redis } from './lib/redis.js';

const PORT = Number(process.env.PORT) || 4000;

async function main() {
  const app = createApp();
  const server = http.createServer(app);

  // Attach Socket.io. The factory wires room/cursor handlers and
  // the Clerk auth handshake.
  createSocketServer(server);

  server.listen(PORT, () => {
    logger.info({ port: PORT }, 'backend listening');
  });

  // ─── Graceful shutdown ──────────────────────────────────
  const shutdown = async (signal) => {
    logger.info({ signal }, 'shutting down');
    server.close(() => logger.info('http closed'));
    try {
      await redis.quit();
    } catch (err) {
      logger.warn({ err }, 'redis quit failed');
    }
    try {
      await prisma.$disconnect();
    } catch (err) {
      logger.warn({ err }, 'prisma disconnect failed');
    }
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  // Last-resort logger — if even main() throws (e.g. bad env),
  // dump to stderr and exit non-zero so the platform restarts.
  // eslint-disable-next-line no-console
  console.error('fatal boot error:', err);
  process.exit(1);
});
