// ============================================================
// Server Entrypoint
// Starts the HTTP server and wires up:
//  - graceful shutdown on SIGTERM/SIGINT (important for
//    zero-downtime deploys on platforms like Docker/K8s)
//  - global handlers for uncaught exceptions / unhandled
//    promise rejections so the process never dies silently
// ============================================================

import app from './app.js';
import env from './config/env.js';
import logger from './config/logger.js';
import prisma from './config/prisma.js';

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 ${env.APP_NAME} running in ${env.NODE_ENV} mode on port ${env.PORT}`);
});

// ------------------------------------------------------------
// Gracefully shut down: stop accepting new connections, finish
// in-flight requests, close the DB pool, then exit.
// ------------------------------------------------------------
const shutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);

  server.close(async () => {
    logger.info('HTTP server closed');
    await prisma.$disconnect();
    logger.info('Database connection closed');
    process.exit(0);
  });

  // Force-exit if shutdown hangs for too long
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ------------------------------------------------------------
// Safety nets — log and exit rather than leaving the process in
// an unknown state after an unhandled error.
// ------------------------------------------------------------
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection', { reason: reason?.message || reason, stack: reason?.stack });
  // Give the logger time to flush before exiting
  setTimeout(() => process.exit(1), 500);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  setTimeout(() => process.exit(1), 500);
});
