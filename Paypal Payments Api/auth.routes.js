// ============================================================
// Auth Routes
// ============================================================

import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import validate from '../middlewares/validate.js';
import { registerRules, loginRules } from '../validators/auth.validator.js';
import { strictLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

// Stricter rate limit on auth routes to slow down credential stuffing
router.post('/register', strictLimiter, validate(registerRules), authController.register);
router.post('/login', strictLimiter, validate(loginRules), authController.login);

export default router;
