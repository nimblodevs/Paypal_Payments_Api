// ============================================================
// Auth Validators
// Field-level validation rules for register/login endpoints.
// ============================================================

import { body } from 'express-validator';

export const registerRules = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
];

export const loginRules = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];
