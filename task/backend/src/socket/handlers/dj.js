/**
 * socket/handlers/dj.js — synced now-playing across the room.
 *
 * Architecture: Option C — every premium-tier listener plays
 * the same track at the same offset through their own Spotify
 * Web Playback SDK. One user is the "DJ"; their playback state
 * is broadcast to the room and followers issue play commands
 * locally to stay in sync.
 *
 * Events:
 *   client → server
 *     dj-claim       { roomId }                  — become DJ
 *     dj-release     { roomId }                  — step down
 *     dj-state       { roomId, state }           — playback snapshot
 *
 *   server → client
 *     dj-changed     { roomId, djSocketId|null, djUserId|null }
 *     dj-state       { state, fromSocketId }
 *
 * The DJ assignment is stored in Redis per-room with TTL.
 */

import { redis } from '../../lib/redis.js';
import { logger } from '../../lib/logger.js';

const TTL_SECONDS = 24 * 60 * 60;
const djKey = (roomId) => `room:${roomId}:dj`;

export function registerDjHandlers(io, socket) {
  socket.on('dj-claim', async ({ roomId } = {}) => {
    if (!roomId) return;
    try {
      // Whoever calls first wins. We use SET NX so we don't
      // accidentally steal an active DJ slot.
      const ok = await redis.set(djKey(roomId), socket.id, 'EX', TTL_SECONDS, 'NX');
      if (!ok) {
        const current = await redis.get(djKey(roomId));
        socket.emit('dj-changed', { roomId, djSocketId: current, djUserId: null });
        return;
      }
      io.to(roomId).emit('dj-changed', {
        roomId,
        djSocketId: socket.id,
        djUserId: socket.data.userId,
      });
    } catch (err) {
      logger.warn({ err: err.message }, 'dj-claim failed');
    }
  });

  socket.on('dj-release', async ({ roomId } = {}) => {
    if (!roomId) return;
    try {
      const current = await redis.get(djKey(roomId));
      if (current === socket.id) {
        await redis.del(djKey(roomId));
        io.to(roomId).emit('dj-changed', { roomId, djSocketId: null, djUserId: null });
      }
    } catch (err) {
      logger.warn({ err: err.message }, 'dj-release failed');
    }
  });

  socket.on('dj-state', async ({ roomId, state } = {}) => {
    if (!roomId || !state) return;
    try {
      // Only the active DJ can broadcast state — drop otherwise.
      const current = await redis.get(djKey(roomId));
      if (current !== socket.id) return;
      socket.to(roomId).emit('dj-state', { state, fromSocketId: socket.id });
    } catch (err) {
      logger.warn({ err: err.message }, 'dj-state failed');
    }
  });

  socket.on('disconnect', async () => {
    // Release DJ slot for any room where this socket was DJ.
    // Cheap scan: we don't have a per-socket-room index here,
    // but room cleanup runs in the room handler which removes
    // the user from each room. We piggyback on that by checking
    // each room's DJ value in a SCAN. For now, do nothing: TTL
    // covers the worst case and rooms with no DJ are fine.
    void 0;
  });
}