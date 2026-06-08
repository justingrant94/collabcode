/**
 * routes/snippets.js — personal snippets CRUD.
 *
 *   GET    /api/snippets        — list (newest first)
 *   POST   /api/snippets        — create
 *   PATCH  /api/snippets/:id    — update (title/code/language)
 *   DELETE /api/snippets/:id    — delete
 *
 * Ownership enforced server-side: every read/write checks
 * userId === req.user.id. Never trust a client-supplied owner.
 */

import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, loadUser } from '../middleware/requireAuth.js';

export const snippetsRouter = Router();

const MAX_CODE_BYTES = 256 * 1024;
const MAX_TITLE_LEN = 80;

// All routes require auth + a loaded user.
snippetsRouter.use(requireAuth, loadUser);

snippetsRouter.get('/', async (req, res, next) => {
  try {
    const snippets = await prisma.snippet.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        language: true,
        code: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.json({ snippets });
  } catch (err) { next(err); }
});

snippetsRouter.post('/', async (req, res, next) => {
  try {
    const { title, code, language } = req.body || {};
    if (typeof code !== 'string') {
      return res.status(400).json({ error: 'missing_code' });
    }
    if (Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES) {
      return res.status(413).json({ error: 'code_too_large' });
    }
    const snippet = await prisma.snippet.create({
      data: {
        userId: req.user.id,
        title: (title || '').toString().slice(0, MAX_TITLE_LEN) || 'Untitled snippet',
        code,
        language: typeof language === 'string' ? language : 'javascript',
      },
    });
    res.status(201).json(snippet);
  } catch (err) { next(err); }
});

snippetsRouter.patch('/:id', async (req, res, next) => {
  try {
    // Ownership check BEFORE update — otherwise prisma's
    // updateMany would silently affect 0 rows on cross-user
    // attempts without telling us why.
    const existing = await prisma.snippet.findUnique({
      where: { id: req.params.id },
      select: { userId: true },
    });
    if (!existing) return res.status(404).json({ error: 'snippet_not_found' });
    if (existing.userId !== req.user.id) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const { title, code, language } = req.body || {};
    if (code !== undefined && Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES) {
      return res.status(413).json({ error: 'code_too_large' });
    }

    const updated = await prisma.snippet.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title: String(title).slice(0, MAX_TITLE_LEN) || 'Untitled snippet' }),
        ...(code !== undefined && { code: String(code) }),
        ...(language !== undefined && { language: String(language) }),
      },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

snippetsRouter.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.snippet.findUnique({
      where: { id: req.params.id },
      select: { userId: true },
    });
    if (!existing) return res.status(404).json({ error: 'snippet_not_found' });
    if (existing.userId !== req.user.id) {
      return res.status(403).json({ error: 'forbidden' });
    }
    await prisma.snippet.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});
