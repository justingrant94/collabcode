/**
 * lib/roomManager.js — Redis-backed live room state.
 *
 * Single source of truth for "what's in this room RIGHT NOW".
 * Durable metadata (owner, createdAt) lives in Postgres; the
 * volatile bits (code buffer, language, connected users) live
 * here with a 24h TTL so abandoned rooms self-clean.
 *
 * Redis keys:
 *   room:<id>:state    HASH    { code, language, lastUpdate }
 *   room:<id>:users    HASH    { <socketId>: <JSON userMeta> }
 *
 * TTL refreshed on every write so an active room never expires;
 * a quiet room evaporates 24h after its last edit.
 */

import { redis } from './redis.js';
import { prisma } from './prisma.js';

const TTL_SECONDS = 24 * 60 * 60; // 24h
const stateKey = (id) => `room:${id}:state`;
const usersKey = (id) => `room:${id}:users`;

/** Random colour assignment from --color-user-N palette (1..8). */
const USER_COLOURS = [
  '#F472B6', '#60A5FA', '#34D399', '#FBBF24',
  '#A78BFA', '#F87171', '#2DD4BF', '#FB923C',
];
export function pickUserColour(seed) {
  // Deterministic by clerk userId so the same user always gets
  // the same colour in the same room (less jarring across reloads).
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return USER_COLOURS[Math.abs(hash) % USER_COLOURS.length];
}

/**
 * Get current code + language for a room. If Redis has nothing
 * yet (cold room), seeds from Postgres language default.
 */
export async function getRoomState(roomId) {
  const cached = await redis.hgetall(stateKey(roomId));
  if (cached && cached.code !== undefined) {
    return { code: cached.code, language: cached.language || 'javascript' };
  }
  // Cold load — fetch language from DB, init code to empty.
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { language: true },
  });
  if (!room) return null;

  const initial = { code: '', language: room.language };
  await redis.hset(stateKey(roomId), initial);
  await redis.expire(stateKey(roomId), TTL_SECONDS);
  return initial;
}

/** Update buffer for a room. Caller should already have validated. */
export async function setRoomCode(roomId, code) {
  const key = stateKey(roomId);
  await redis.hset(key, { code, lastUpdate: Date.now().toString() });
  await redis.expire(key, TTL_SECONDS);
  // Best-effort touch — don't block the socket on the DB.
  prisma.room
    .update({ where: { id: roomId }, data: { lastActiveAt: new Date() } })
    .catch(() => {});
}

/** Change language for a room. */
export async function setRoomLanguage(roomId, language) {
  const key = stateKey(roomId);
  await redis.hset(key, { language });
  await redis.expire(key, TTL_SECONDS);
  prisma.room
    .update({ where: { id: roomId }, data: { language } })
    .catch(() => {});
}

/** Add a user to the in-memory roster. */
export async function addUserToRoom(roomId, socketId, meta) {
  const key = usersKey(roomId);
  await redis.hset(key, socketId, JSON.stringify(meta));
  await redis.expire(key, TTL_SECONDS);
}

/** Remove a user from the roster. */
export async function removeUserFromRoom(roomId, socketId) {
  await redis.hdel(usersKey(roomId), socketId);
}

/** List all users currently in a room (parsed). */
export async function listRoomUsers(roomId) {
  const raw = await redis.hgetall(usersKey(roomId));
  return Object.entries(raw).map(([socketId, json]) => {
    try {
      return { socketId, ...JSON.parse(json) };
    } catch {
      return { socketId };
    }
  });
}
