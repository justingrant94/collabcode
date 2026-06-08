/**
 * lib/logger.js — pino logger.
 *
 * Pretty in dev, JSON in prod. Use logger.info({...}, 'msg')
 * pattern; never logger.info('msg ' + value).
 */

import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss' },
      }
    : undefined,
  // Never log these keys, even if accidentally included.
  redact: {
    paths: ['*.password', '*.accessToken', '*.refreshToken', 'req.headers.authorization'],
    censor: '[redacted]',
  },
});
