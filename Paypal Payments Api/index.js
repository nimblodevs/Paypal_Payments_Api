// ============================================================
// API Router
// Mounts every feature router under a single versioned prefix.
// Versioning (/api/v1) makes it possible to introduce breaking
// changes later via /api/v2 without disrupting existing clients.
// ============================================================

import { Router } from 'express';
import authRoutes from './auth.routes.js';
import paymentRoutes from './payment.routes.js';
import webhookRoutes from './webhook.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/payments', paymentRoutes);
router.use('/webhooks', webhookRoutes);

export default router;
