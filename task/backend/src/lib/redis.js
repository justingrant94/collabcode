/**
 * lib/redis.js — singleton ioredis client.
 *
 * Used for:
 *   - Live room state (code buffer, language)
 *   - Connected user roster per room
 *   - Cursor positions (ephemeral, transmitted via socket only)
 *   - 24h TTL on rooms so abandoned ones self-clean
 *
 * Local dev: docker-compose service "redis" at redis://localhost:6379
 * Prod:     Upstash REDIS_URL with TLS (rediss://)
 */

import Redis from 'ioredis';
import { logger } from './logger.js';

const url = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(url, {
  // Avoid hanging the process if redis is briefly unreachable;
  // commands queue locally and replay on reconnect.
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: false,
});

redis.on('error', (err) => {
  logger.warn({ err: err.message }, 'redis error');
});
redis.on('connect', () => {
  logger.info('redis connected');
});
