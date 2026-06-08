/**
 * lib/prisma.js — singleton Prisma client.
 *
 * Why singleton: opening a new PrismaClient per request leaks
 * connections fast. Single instance per process is the norm.
 */

import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
});
