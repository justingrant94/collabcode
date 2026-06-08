/**
 * middleware/requireAuth.js — Clerk session verification.
 *
 * Verifies the Authorization: Bearer <token> header against
 * Clerk's JWKS and attaches the decoded claims to req.auth.
 *
 * Usage:
 *   router.get('/protected', requireAuth, (req, res) => {
 *     // req.auth.userId is the Clerk user id (e.g. "user_abc...")
 *     // req.user is the local Postgres User row (lazy-loaded)
 *   });
 *
 * Returns 401 if missing/invalid. Distinct error codes so the
 * frontend can decide how to react.
 */

import { verifyToken } from '@clerk/clerk-sdk-node';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

const SECRET_KEY = process.env.CLERK_SECRET_KEY;

// ────────────────────────────────────────────────────────────
// DEV-ONLY AUTH BYPASS
// ────────────────────────────────────────────────────────────
// When DEV_BYPASS_AUTH=true and NODE_ENV !== 'production', the
// middleware accepts the literal token "dev" and forges a
// session for a fake user (clerkId = DEV_BYPASS_USER_ID, default
// 'user_dev_local'). This unlocks API smoke-testing via curl /
// Playwright without going through Clerk OAuth.
//
// Refuses to activate in production no matter what — even if the
// env var is accidentally set on a deployed instance. The whole
// safety story is: only short-circuit if `NODE_ENV !==
// 'production'` AND the flag is on AND the client explicitly
// presented the dev token.
// ────────────────────────────────────────────────────────────
const DEV_BYPASS_ENABLED =
  process.env.DEV_BYPASS_AUTH === 'true' && process.env.NODE_ENV !== 'production';
const DEV_BYPASS_USER_ID = process.env.DEV_BYPASS_USER_ID || 'user_dev_local';
const DEV_BYPASS_TOKEN = 'dev';

if (DEV_BYPASS_ENABLED) {
  logger.warn(
    { devUserId: DEV_BYPASS_USER_ID },
    '⚠️  DEV_BYPASS_AUTH is ENABLED — Authorization: Bearer dev will be accepted as a fake user. NEVER enable in production.',
  );
}

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return res.status(401).json({ error: 'missing_token' });
    }

    const token = match[1];

    // Dev bypass short-circuit — exact token match, dev-only.
    if (DEV_BYPASS_ENABLED && token === DEV_BYPASS_TOKEN) {
      req.auth = {
        userId: DEV_BYPASS_USER_ID,
        sessionId: 'sess_dev_local',
        claims: { sub: DEV_BYPASS_USER_ID, dev: true },
      };
      return next();
    }

    if (!SECRET_KEY) {
      // Refuse to silently accept tokens if the server is mis-
      // configured — would otherwise be a critical auth bypass.
      logger.error('CLERK_SECRET_KEY is not set — refusing all auth');
      return res.status(500).json({ error: 'auth_misconfigured' });
    }

    let claims;
    try {
      claims = await verifyToken(token, { secretKey: SECRET_KEY });
    } catch (err) {
      logger.debug({ err: err.message }, 'token verify failed');
      return res.status(401).json({ error: 'invalid_token' });
    }

    req.auth = {
      userId: claims.sub,        // Clerk user id ("user_…")
      sessionId: claims.sid,
      claims,
    };

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Loads the local DB user record corresponding to the Clerk
 * user. Use AFTER requireAuth. Cached on req so multiple
 * middlewares can call it cheaply per request.
 *
 * Creates the row if missing — this can happen briefly if the
 * Clerk webhook hasn't fired yet for a brand-new user.
 */
export async function loadUser(req, res, next) {
  try {
    if (req.user) return next();
    if (!req.auth?.userId) {
      return res.status(401).json({ error: 'not_authenticated' });
    }

    let user = await prisma.user.findUnique({
      where: { clerkId: req.auth.userId },
    });

    if (!user) {
      // Fallback create — webhook will fill the rest later.
      user = await prisma.user.create({
        data: { clerkId: req.auth.userId },
      });
      logger.info({ clerkId: req.auth.userId }, 'user lazy-created (webhook pending)');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
