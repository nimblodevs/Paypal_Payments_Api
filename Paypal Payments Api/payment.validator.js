// ============================================================
// Payment Validators
// Field-level validation rules for creating/capturing payments.
// ============================================================

import { body, param, query } from 'express-validator';

export const createOrderRules = [
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .bail()
    .isFloat({ gt: 0 })
    .withMessage('Amount must be a positive number'),
  body('currency')
    .optional()
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter ISO code (e.g. USD)'),
  body('description').optional().isString().isLength({ max: 255 }),
  body('referenceId').optional().isString().isLength({ max: 100 }),
];

export const orderIdParamRule = [
  param('orderId').isString().notEmpty().withMessage('orderId param is required'),
];

export const listPaymentsRules = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('status')
    .optional()
    .isIn(['CREATED', 'APPROVED', 'COMPLETED', 'DENIED', 'FAILED', 'REFUNDED', 'CANCELLED']),
];
