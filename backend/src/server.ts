import app from './app';
import { env } from './config/env';
import { logger } from './lib/logger';

const host = process.env.HOST || '0.0.0.0';

const server = app.listen(env.PORT, host, () => {
  logger.info(`⚡️ NexGuard backend server listening on ${host}:${env.PORT} [${env.NODE_ENV}]`);
});

const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Shutting down HTTP server gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Could not close open HTTP connections in time, forcefully exiting.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});
