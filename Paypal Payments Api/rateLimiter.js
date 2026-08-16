// ============================================================
// Rate Limiter
// Protects the API from brute-force and abuse by limiting the
// number of requests a single IP can make within a time window.
// Two limiters are exported: a general one for the whole API,
// and a stricter one for sensitive endpoints (auth, payments).
// ============================================================

import rateLimit from 'express-rate-limit';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

const buildLimiter = ({ windowMs, max, message }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true, // return rate limit info in RateLimit-* headers
    legacyHeaders: false,
    handler: (req, res, next) => {
      next(ApiError.tooManyRequests(message));
    },
  });

// General limiter applied to all API routes
export const generalLimiter = buildLimiter({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  message: 'Too many requests from this IP, please try again later.',
});

// Stricter limiter for endpoints that create payments or handle auth,
// to slow down credential stuffing / payment-spam attempts.
export const strictLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: 'Too many attempts on this endpoint, please slow down.',
});
