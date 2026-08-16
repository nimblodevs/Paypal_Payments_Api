// ============================================================
// Auth Service
// Handles business-user registration and login, including
// password hashing and JWT issuance.
// ============================================================

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

const SALT_ROUNDS = 12;

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

/** Strips the password hash before returning a user object to the client */
function sanitizeUser(user) {
  const { password, ...safe } = user;
  return safe;
}

export async function register({ email, password, fullName }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { email, password: passwordHash, fullName },
  });

  const token = signToken(user);
  return { user: sanitizeUser(user), token };
}

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Use a generic message for both "no user" and "wrong password"
  // to avoid leaking which emails are registered (user enumeration).
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated');
  }

  const token = signToken(user);
  return { user: sanitizeUser(user), token };
}
