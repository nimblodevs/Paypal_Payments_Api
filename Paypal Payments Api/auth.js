// ============================================================
// Authentication & Authorization Middleware
// Verifies a Bearer JWT on protected routes and attaches the
// decoded payload to req.user. `authorize` further restricts
// access to specific roles (e.g. ADMIN-only endpoints).
// ============================================================

import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import prisma from '../config/prisma.js';

/**
 * Requires a valid JWT in the Authorization header:
 *   Authorization: Bearer <token>
 */
export const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Authentication token missing');
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  // Confirm the user still exists and is active — handles the
  // case where a token was issued but the account was later disabled.
  const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('User no longer active');
  }

  req.user = { id: user.id, email: user.email, role: user.role };
  next();
});

/**
 * Restricts a route to specific roles. Must run after `authenticate`.
 * Usage: authorize('ADMIN')
 */
export const authorize =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };
