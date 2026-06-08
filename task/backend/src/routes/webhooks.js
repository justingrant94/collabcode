/**
 * routes/webhooks.js — Clerk webhook receiver.
 *
 * Verifies the svix signature using CLERK_WEBHOOK_SECRET, then
 * mirrors Clerk user events into our Postgres User table.
 *
 * Body parser: RAW (express.raw) is scoped to this router only,
 * because svix needs the exact bytes Clerk signed — the global
 * express.json() parser must not run first.
 *
 * Configure the webhook in the Clerk dashboard:
 *   Endpoint: https://your-backend/webhooks/clerk
 *   Events:   user.created, user.updated, user.deleted
 */

import { Router, raw } from 'express';
import { Webhook } from 'svix';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

export const clerkWebhookRouter = Router();

clerkWebhookRouter.use(raw({ type: 'application/json' }));

clerkWebhookRouter.post('/', async (req, res, next) => {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    logger.error('CLERK_WEBHOOK_SECRET is not set — rejecting webhook');
    return res.status(500).json({ error: 'webhook_misconfigured' });
  }

  const headers = {
    'svix-id': req.header('svix-id'),
    'svix-timestamp': req.header('svix-timestamp'),
    'svix-signature': req.header('svix-signature'),
  };

  let event;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(req.body.toString('utf8'), headers);
  } catch (err) {
    logger.warn({ err: err.message }, 'webhook signature verification failed');
    return res.status(400).json({ error: 'invalid_signature' });
  }

  try {
    switch (event.type) {
      case 'user.created':
      case 'user.updated':
        await upsertUser(event.data);
        break;
      case 'user.deleted':
        await deleteUser(event.data);
        break;
      default:
        logger.debug({ type: event.type }, 'webhook event ignored');
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/**
 * Sync a Clerk user payload into our User table.
 * Idempotent — runs for both .created and .updated.
 */
async function upsertUser(data) {
  // Clerk's email_addresses is an array; pick the primary one.
  const primaryEmailId = data.primary_email_address_id;
  const primaryEmail =
    data.email_addresses?.find((e) => e.id === primaryEmailId)?.email_address ||
    data.email_addresses?.[0]?.email_address ||
    null;

  const displayName =
    [data.first_name, data.last_name].filter(Boolean).join(' ').trim() ||
    data.username ||
    null;

  await prisma.user.upsert({
    where: { clerkId: data.id },
    create: {
      clerkId: data.id,
      email: primaryEmail,
      displayName,
      imageUrl: data.image_url || null,
    },
    update: {
      email: primaryEmail,
      displayName,
      imageUrl: data.image_url || null,
    },
  });

  logger.info({ clerkId: data.id }, 'user upserted');
}

async function deleteUser(data) {
  // Clerk sends { id, deleted: true } on user.deleted events.
  if (!data.id) return;
  await prisma.user.deleteMany({ where: { clerkId: data.id } });
  logger.info({ clerkId: data.id }, 'user deleted');
}
