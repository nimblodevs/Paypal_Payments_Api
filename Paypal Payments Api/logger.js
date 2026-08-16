// ============================================================
// Centralized Logger (Winston)
//
// Development: human-readable, colorized console output.
// Production : structured JSON logs written to rotating daily
//              files (so they can be shipped to a log
//              aggregator like Datadog/ELK/CloudWatch) PLUS a
//              separate error-only file for fast triage.
// ============================================================

import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import env from './env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.join(__dirname, '..', '..', 'logs');

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Human-friendly format used only in development
const devFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `${ts} [${level}]: ${stack || message} ${metaStr}`;
  })
);

// Machine-friendly JSON format used in production
const prodFormat = combine(timestamp(), errors({ stack: true }), json());

const transports = [];

if (env.isProduction) {
  // Rotating file transport for all logs (info and above)
  transports.push(
    new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d', // keep 2 weeks of logs
      level: env.LOG_LEVEL,
    })
  );

  // Separate rotating file transport just for errors — makes
  // it fast to grep for failures without wading through info logs
  transports.push(
    new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
    })
  );

  // Also log to console in production (useful when running in
  // containers where stdout is captured by the orchestrator)
  transports.push(new winston.transports.Console({ format: prodFormat }));
} else {
  // In development, just log to console with readable formatting
  transports.push(new winston.transports.Console({ format: devFormat }));
}

const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: env.isProduction ? prodFormat : devFormat,
  defaultMeta: { service: env.APP_NAME },
  transports,
  exitOnError: false,
});

export default logger;
