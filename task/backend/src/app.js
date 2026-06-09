/**
 * src/app.js — Express app factory.
 *
 * Pure factory so tests can spin up the app without binding a
 * port. All routes mount here. Webhook route is mounted BEFORE
 * express.json() because Clerk webhooks need the raw body for
 * signature verification (svix).
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { logger } from './lib/logger.js';
import { clerkWebhookRouter } from './routes/webhooks.js';
import { roomsRouter } from './routes/rooms.js';
import { executeRouter } from './routes/execute.js';
import { snippetsRouter } from './routes/snippets.js';
import { userRouter } from './routes/user.js';

export function createApp() {
  const app = express();

  // Trust Fly.io / Netlify proxy for correct req.ip
  app.set('trust proxy', 1);

  // ─── Request logging ───────────────────────────────────
  // Logs every request with status + duration. Vital for
  // debugging "I clicked Run and got an error" type issues.
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const durationMs = Date.now() - start;
      const level = res.statusCode >= 500 ? 'error'
        : res.statusCode >= 400 ? 'warn'
        : 'info';
      logger[level](
        {
          method: req.method,
          path: req.originalUrl,
          status: res.statusCode,
          durationMs,
          ip: req.ip,
        },
        `${req.method} ${req.originalUrl} → ${res.statusCode} (${durationMs}ms)`,
      );
    });
    next();
  });

  // ─── Security headers ──────────────────────────────────
  // Disable CSP from helmet — Vite/Monaco worker scripts need a
  // bespoke policy we'd rather omit than get wrong. Other
  // helmet defaults (X-Frame-Options, etc.) stay on.
  app.use(helmet({ contentSecurityPolicy: false }));

  // ─── CORS ──────────────────────────────────────────────
  // Allow a comma-separated list so we can keep both 127.0.0.1
  // and localhost in dev.
  const originList = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim());
  app.use(cors({ origin: originList, credentials: true }));

  // ─── Clerk webhook (RAW body, mounted before json parser) ─
  app.use('/webhooks/clerk', clerkWebhookRouter);

  // ─── Body parser for normal JSON routes ────────────────
  app.use(express.json({ limit: '1mb' }));

  // ─── Health check ──────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // ─── REST routes ───────────────────────────────────────
  app.use('/api/rooms', roomsRouter);
  app.use('/api/execute', executeRouter);
  app.use('/api/snippets', snippetsRouter);
  app.use('/api/me', userRouter);

  // ─── 404 ───────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ error: 'not_found' });
  });

  // ─── Error handler ─────────────────────────────────────
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    const status = err.status || 500;
    // Always log the full error so the operator can see it in
    // the terminal, regardless of status code. Stack included
    // for >= 500 only to avoid noise from 4xx user errors.
    logger.error(
      {
        err: err.message,
        code: err.code,
        status,
        path: req?.originalUrl,
        method: req?.method,
        stack: status >= 500 ? err.stack : undefined,
      },
      'request error',
    );
    res.status(status).json({
      error: err.code || 'internal_error',
      // Surface the real message in dev so the user sees it in
      // the browser toast. In production we hide it for 5xx to
      // avoid leaking internals.
      message:
        process.env.NODE_ENV === 'production' && status >= 500
          ? 'something went wrong'
          : err.message,
    });
  });

  return app;
}
