/**
 * routes/user.js — current-user profile.
 *
 *   GET   /api/me              — return profile
 *   PATCH /api/me/accent       — { accentColor: "#RRGGBB" }
 *
 * The accentColor doubles as the user's collaborative-cursor
 * colour, so we restrict it to a small validated palette to keep
 * peer cursors readable on dark + light themes.
 */

import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, loadUser } from '../middleware/requireAuth.js';

export const userRouter = Router();

// Same palette as --color-user-1..8 in root.css.
const ACCENT_PALETTE = new Set([
  '#F472B6', '#60A5FA', '#34D399', '#FBBF24',
  '#A78BFA', '#F87171', '#2DD4BF', '#FB923C',
  // Plus the brand accent (default for those who don't customise).
  '#7C5CFC',
]);

userRouter.use(requireAuth, loadUser);

userRouter.get('/', (req, res) => {
  res.json({
    id: req.user.id,
    clerkId: req.user.clerkId,
    email: req.user.email,
    displayName: req.user.displayName,
    imageUrl: req.user.imageUrl,
    accentColor: req.user.accentColor,
  });
});

userRouter.patch('/accent', async (req, res, next) => {
  try {
    const { accentColor } = req.body || {};
    if (typeof accentColor !== 'string' || !ACCENT_PALETTE.has(accentColor)) {
      return res.status(400).json({ error: 'invalid_accent', allowed: [...ACCENT_PALETTE] });
    }
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { accentColor },
      select: { id: true, accentColor: true },
    });
    res.json(updated);
  } catch (err) { next(err); }
});