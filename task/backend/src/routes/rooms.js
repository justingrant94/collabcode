/**
 * routes/rooms.js — room CRUD.
 *
 * Endpoints:
 *   POST /api/rooms        — create a new room (auth required)
 *   GET  /api/rooms/:id    — fetch metadata for a room
 *
 * The Redis-backed live state (code buffer, roster, cursors)
 * is owned by socket handlers (Phase 3). This file deals only
 * with durable Postgres metadata.
 */

import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, loadUser } from '../middleware/requireAuth.js';

export const roomsRouter = Router();

const SUPPORTED_LANGUAGES = new Set([
  'javascript',
  'typescript',
  'python',
  'go',
  'rust',
  'java',
  'c',
  'cpp',
]);

// ─── Create room ──────────────────────────────────────────
roomsRouter.post('/', requireAuth, loadUser, async (req, res, next) => {
  try {
    const reqLang = String(req.body?.language || 'javascript').toLowerCase();
    const language = SUPPORTED_LANGUAGES.has(reqLang) ? reqLang : 'javascript';

    const room = await prisma.room.create({
      data: {
        ownerId: req.user.id,
        language,
      },
    });

    res.status(201).json({
      id: room.id,
      ownerId: room.ownerId,
      language: room.language,
      createdAt: room.createdAt,
    });
  } catch (err) {
    next(err);
  }
});

// ─── Get room metadata ────────────────────────────────────
// Public read — anyone with the link can preview metadata.
// Joining the live session still requires socket auth.
roomsRouter.get('/:id', async (req, res, next) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        language: true,
        createdAt: true,
        lastActiveAt: true,
      },
    });
    if (!room) {
      return res.status(404).json({ error: 'room_not_found' });
    }
    res.json(room);
  } catch (err) {
    next(err);
  }
});
