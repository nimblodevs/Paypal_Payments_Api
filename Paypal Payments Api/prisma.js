// ============================================================
// Prisma Client Singleton
//
// Instantiating `new PrismaClient()` on every import can exhaust
// database connections (especially with hot-reloading in dev).
// This module guarantees exactly one instance is created and
// reused across the whole application.
// ============================================================

import { PrismaClient } from '@prisma/client';
import env from './env.js';
import logger from './logger.js';

const prisma = new PrismaClient({
  log: env.isProduction
    ? [{ emit: 'event', level: 'error' }]
    : [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
});

// Pipe Prisma's internal events into our Winston logger so all
// logs (app + DB) end up in one consistent place.
prisma.$on('error', (e) => logger.error('Prisma error', { error: e.message }));
if (!env.isProduction) {
  prisma.$on('query', (e) =>
    logger.debug('Prisma query', { query: e.query, params: e.params, duration: `${e.duration}ms` })
  );
  prisma.$on('warn', (e) => logger.warn('Prisma warning', { message: e.message }));
}

export default prisma;
