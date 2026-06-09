/**
 * routes/execute.js — Docker-sandboxed code execution.
 *
 *   POST /api/execute  { language, code } → { stdout, stderr, exitCode, ... }
 *
 * - Rate-limited: 10 req/min per IP (express-rate-limit).
 * - Auth required.
 * - Env-gated by ENABLE_EXECUTE so we can disable on hosts that
 *   don't support docker-in-docker.
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { runCode, isLanguageSupported } from '../lib/runner.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { logger } from '../lib/logger.js';

export const executeRouter = Router();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited', retryAfter: '1m' },
});

const previewLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited', retryAfter: '1m' },
});

const ENABLED = process.env.ENABLE_EXECUTE !== 'false';
const MAX_CODE_BYTES = 256 * 1024;

async function executeRequest(req, res, next) {
  try {
    if (!ENABLED) {
      logger.warn('execute: server-side disabled (ENABLE_EXECUTE=false)');
      return res.status(503).json({ error: 'execute_disabled' });
    }
    const { language, code } = req.body || {};
    if (typeof code !== 'string' || !code) {
      logger.warn(
        { language, codeType: typeof code, codeLen: code?.length ?? 0 },
        'execute: missing_code',
      );
      return res.status(400).json({ error: 'missing_code' });
    }
    if (Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES) {
      logger.warn({ bytes: Buffer.byteLength(code, 'utf8') }, 'execute: code_too_large');
      return res.status(413).json({ error: 'code_too_large' });
    }
    if (!isLanguageSupported(language)) {
      logger.warn({ language }, 'execute: unsupported_language');
      return res.status(400).json({ error: 'unsupported_language', language });
    }

    const result = await runCode({ language, code });
    res.json(result);
  } catch (err) {
    logger.error({ err: err.message, code: err.code }, 'execute failed');
    next(err);
  }
}

executeRouter.post('/preview', previewLimiter, executeRequest);
executeRouter.post('/', requireAuth, limiter, executeRequest);
