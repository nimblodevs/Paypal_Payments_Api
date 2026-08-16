// ============================================================
// Auth Controller
// HTTP layer for merchant/business-user registration and login.
// ============================================================

import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import * as authService from '../services/auth.service.js';
import logger from '../config/logger.js';

// POST /api/v1/auth/register
export const register = asyncHandler(async (req, res) => {
  const { email, password, fullName } = req.body;
  const result = await authService.register({ email, password, fullName });

  logger.info('New merchant registered', { userId: result.user.id, email: result.user.email });
  return new ApiResponse(201, result, 'Account created successfully').send(res);
});

// POST /api/v1/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login({ email, password });

  logger.info('Merchant logged in', { userId: result.user.id });
  return new ApiResponse(200, result, 'Logged in successfully').send(res);
});
