// ============================================================
// Webhook Routes
// ============================================================

import { Router } from 'express';
import * as webhookController from '../controllers/webhook.controller.js';

const router = Router();

router.post('/paypal', webhookController.handlePaypalWebhook);

export default router;
