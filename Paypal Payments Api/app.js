// ============================================================
// Express Application
// Wires together every middleware and route. Exported (not
// started) so it can be reused by test suites without binding
// a real port. Built on Express 5, which is now the framework's
// stable "latest" release line (ESM-native, Node 18+ required).
// ============================================================

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import hpp from 'hpp';

import env from './config/env.js';
import requestLogger from './middlewares/requestLogger.js';
import { generalLimiter } from './middlewares/rateLimiter.js';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.js';
import rawBodySaver from './middlewares/rawBody.js';
import apiRouter from './routes/index.js';

const app = express();

// Trust the first proxy hop (needed on platforms like Heroku/Render/behind
// an Nginx load balancer) so req.ip / rate-limiting see the real client IP.
app.set('trust proxy', 1);

// --------------------------------------------------------
// Security headers
// --------------------------------------------------------
app.use(helmet());

// --------------------------------------------------------
// CORS — restrict to an explicit allow-list of origins from env,
// rather than reflecting any origin.
// --------------------------------------------------------
const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser tools (curl/Postman/server-to-server) which send no origin
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// --------------------------------------------------------
// Body parsing — capture the raw body too, required for PayPal
// webhook signature verification later in the request chain.
// --------------------------------------------------------
app.use(express.json({ limit: '1mb', verify: rawBodySaver }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// --------------------------------------------------------
// Prevent HTTP Parameter Pollution (e.g. ?status=A&status=B tricks)
// --------------------------------------------------------
app.use(hpp());

// --------------------------------------------------------
// Response compression
// --------------------------------------------------------
app.use(compression());

// --------------------------------------------------------
// HTTP request logging (morgan -> winston)
// --------------------------------------------------------
app.use(requestLogger);

// --------------------------------------------------------
// Global rate limiting (applies to every route below)
// --------------------------------------------------------
app.use(generalLimiter);

// --------------------------------------------------------
// Health check — used by load balancers / uptime monitors.
// Deliberately unauthenticated and lightweight.
// --------------------------------------------------------
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString(), env: env.NODE_ENV });
});

// --------------------------------------------------------
// Main API routes
// --------------------------------------------------------
app.use('/api/v1', apiRouter);

// --------------------------------------------------------
// 404 + centralized error handler (must be registered last)
// --------------------------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
