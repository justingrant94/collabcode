/**
 * socket/handlers/room.js — collaborative room handlers.
 *
 * Wire into a socket once it has passed handshake auth. Events:
 *
 *   client → server
 *     join-room        { roomId }
 *     leave-room       { roomId }
 *     code-change      { roomId, code }      (debounced on client)
 *     cursor-move      { roomId, position }  (throttled on client)
 *     language-change  { roomId, language }
 *
 *   server → client (room-scoped)
 *     room-state       { code, language, users }   (sent once on join)
 *     user-joined      { userId, socketId, ... }
 *     user-left        { socketId }
 *     code-change      { code, fromSocketId }
 *     cursor-move      { socketId, position }
 *     language-change  { language, fromSocketId }
 *
 * Authorization model: any signed-in user with the link can join
 * (matches the user's spec). We never broadcast the cursor back
 * to its sender to avoid jitter.
 */

import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import {
  addUserToRoom,
  removeUserFromRoom,
  listRoomUsers,
  getRoomState,
  setRoomCode,
  setRoomLanguage,
  pickUserColour,
} from '../../lib/roomManager.js';

const MAX_CODE_BYTES = 256 * 1024; // 256 KB safety ceiling
const VALID_LANGS = new Set([
  'javascript', 'typescript', 'python', 'go', 'rust', 'java', 'c', 'cpp',
]);

export function registerRoomHandlers(io, socket) {
  // Track which rooms this socket has joined so we can clean
  // up the roster on disconnect even if the client never sent
  // an explicit leave-room.
  const joinedRooms = new Set();

  socket.on('join-room', async ({ roomId } = {}, ack) => {
    try {
      if (!roomId || typeof roomId !== 'string') {
        return ack?.({ error: 'bad_room_id' });
      }

      // Confirm the room actually exists in Postgres.
      const room = await prisma.room.findUnique({ where: { id: roomId } });
      if (!room) return ack?.({ error: 'room_not_found' });

      // Load this user's display info from the DB. Lazy-create
      // if the Clerk webhook hasn't run yet (mirrors HTTP path).
      let user = await prisma.user.findUnique({
        where: { clerkId: socket.data.userId },
      });
      if (!user) {
        user = await prisma.user.create({ data: { clerkId: socket.data.userId } });
      }

      const meta = {
        userId: user.id,
        clerkId: user.clerkId,
        displayName: user.displayName || 'Anonymous',
        imageUrl: user.imageUrl || null,
        // Prefer the user's chosen accentColor; fall back to a
        // deterministic colour based on their id.
        colour: user.accentColor || pickUserColour(user.clerkId),
      };

      socket.join(roomId);
      joinedRooms.add(roomId);
      await addUserToRoom(roomId, socket.id, meta);

      // Send the initial state ONLY to the joining socket.
      const state = await getRoomState(roomId);
      const users = await listRoomUsers(roomId);
      ack?.({ ok: true, state, users });

      // Tell everyone else in the room about the new arrival.
      socket.to(roomId).emit('user-joined', { socketId: socket.id, ...meta });
    } catch (err) {
      logger.error({ err }, 'join-room failed');
      ack?.({ error: 'internal_error' });
    }
  });

  socket.on('leave-room', async ({ roomId } = {}) => {
    if (!roomId) return;
    await cleanupRoom(roomId);
  });

  socket.on('code-change', async ({ roomId, code } = {}) => {
    if (!roomId || typeof code !== 'string') return;
    if (!joinedRooms.has(roomId)) return; // not a member
    if (code.length > MAX_CODE_BYTES) return; // safety cap
    await setRoomCode(roomId, code);
    // Broadcast to everyone else (not the sender).
    socket.to(roomId).emit('code-change', { code, fromSocketId: socket.id });
  });

  socket.on('cursor-move', ({ roomId, position } = {}) => {
    if (!roomId || !position) return;
    if (!joinedRooms.has(roomId)) return;
    // Cursor is ephemeral — never persisted, only broadcast.
    socket.to(roomId).emit('cursor-move', { socketId: socket.id, position });
  });

  socket.on('language-change', async ({ roomId, language } = {}) => {
    if (!roomId || !VALID_LANGS.has(language)) return;
    if (!joinedRooms.has(roomId)) return;
    await setRoomLanguage(roomId, language);
    io.to(roomId).emit('language-change', { language, fromSocketId: socket.id });
  });

  socket.on('disconnect', async () => {
    for (const roomId of joinedRooms) {
      await cleanupRoom(roomId);
    }
  });

  /** Remove this socket from a room + broadcast the departure. */
  async function cleanupRoom(roomId) {
    try {
      socket.leave(roomId);
      joinedRooms.delete(roomId);
      await removeUserFromRoom(roomId, socket.id);
      io.to(roomId).emit('user-left', { socketId: socket.id });
    } catch (err) {
      logger.warn({ err: err.message, roomId }, 'cleanup failed');
    }
  }
}
