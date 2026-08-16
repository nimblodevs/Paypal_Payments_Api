// ============================================================
// Payment Routes
// ============================================================

import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller.js';
import validate from '../middlewares/validate.js';
import { createOrderRules, orderIdParamRule, listPaymentsRules } from '../validators/payment.validator.js';
import { authenticate } from '../middlewares/auth.js';
import { strictLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

// Creating and capturing money-moving operations get the stricter limiter.
// Note: create-order intentionally does NOT require authentication so it
// can be called from a public checkout page — attach `authenticate`
// before it if you want to require merchants to be logged in first.
router.post('/create-order', strictLimiter, validate(createOrderRules), paymentController.createOrder);
router.post('/:orderId/capture', strictLimiter, validate(orderIdParamRule), paymentController.captureOrder);

router.get('/:orderId', validate(orderIdParamRule), paymentController.getPayment);

// Listing all payments is a merchant-facing dashboard feature — protected.
router.get('/', authenticate, validate(listPaymentsRules), paymentController.listPayments);

export default router;
