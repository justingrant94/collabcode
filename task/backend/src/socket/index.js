/**
 * socket/index.js — Socket.io server factory.
 *
 * Phase 1 wiring:
 *   - Verify Clerk session token on handshake (auth required)
 *   - Attach decoded userId to socket.data.userId
 *
 * Phase 3 will add:
 *   - room handlers (join, leave, code-change, cursor-move)
 *   - room roster in Redis with TTL
 *   - cursor throttling
 *
 * Token transport: clients pass the JWT via
 *   io(url, { auth: { token: <jwt> } })
 * (We accept the legacy `query.token` too for easy curl tests.)
 */

import { Server as IOServer } from 'socket.io';
import { verifyToken } from '@clerk/clerk-sdk-node';
import { logger } from '../lib/logger.js';
import { registerRoomHandlers } from './handlers/room.js';

export function createSocketServer(httpServer) {
  const io = new IOServer(httpServer, {
    cors: {
      origin: (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
        .split(',')
        .map((s) => s.trim()),
      credentials: true,
    },
    // Long-polling fallback only as a last resort; ws first.
    transports: ['websocket', 'polling'],
  });

  // Same dev-only auth bypass as the REST middleware. Refer to
  // middleware/requireAuth.js for the safety story.
  const devBypass =
    process.env.DEV_BYPASS_AUTH === 'true' && process.env.NODE_ENV !== 'production';
  const devUserId = process.env.DEV_BYPASS_USER_ID || 'user_dev_local';

  // ─── Handshake auth ─────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('missing_token'));
      }
      if (devBypass && token === 'dev') {
        socket.data.userId = devUserId;
        socket.data.sessionId = 'sess_dev_local';
        return next();
      }
      const secretKey = process.env.CLERK_SECRET_KEY;
      if (!secretKey) {
        logger.error('CLERK_SECRET_KEY is not set — rejecting socket');
        return next(new Error('auth_misconfigured'));
      }
      const claims = await verifyToken(token, { secretKey });
      socket.data.userId = claims.sub;
      socket.data.sessionId = claims.sid;
      next();
    } catch (err) {
      logger.debug({ err: err.message }, 'socket auth failed');
      next(new Error('invalid_token'));
    }
  });

  io.on('connection', (socket) => {
    logger.debug({ id: socket.id, userId: socket.data.userId }, 'socket connected');
    registerRoomHandlers(io, socket);
    socket.on('disconnect', (reason) => {
      logger.debug({ id: socket.id, reason }, 'socket disconnected');
    });
  });

  return io;
}
