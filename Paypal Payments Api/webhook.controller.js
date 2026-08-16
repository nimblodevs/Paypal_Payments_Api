// ============================================================
// Webhook Controller
// Receives asynchronous payment status updates directly from
// PayPal (e.g. PAYMENT.CAPTURE.COMPLETED, PAYMENT.CAPTURE.DENIED,
// PAYMENT.CAPTURE.REFUNDED). This is the recommended source of
// truth for payment state in production — the client-driven
// capture call can fail to reach your server even if PayPal
// successfully processed the payment.
// ============================================================

import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import * as paypalService from '../services/paypal.service.js';
import prisma from '../config/prisma.js';
import logger from '../config/logger.js';
import env from '../config/env.js';

// POST /api/v1/webhooks/paypal
export const handlePaypalWebhook = asyncHandler(async (req, res) => {
  const { rawBody } = req;
  const event = req.body;

  // --------------------------------------------------------
  // 1. Verify the signature — reject anything not genuinely
  //    from PayPal. Skipped only if explicitly unconfigured
  //    in a local/dev environment.
  // --------------------------------------------------------
  if (env.PAYPAL_WEBHOOK_ID) {
    const isValid = await paypalService.verifyWebhookSignature(req.headers, rawBody);
    if (!isValid) {
      logger.warn('Rejected webhook with invalid signature', { eventType: event?.event_type });
      throw ApiError.unauthorized('Invalid webhook signature');
    }
  }

  // --------------------------------------------------------
  // 2. Idempotency check — PayPal may redeliver the same event.
  //    We store paypalEventId as unique so re-processing is a no-op.
  // --------------------------------------------------------
  const alreadyProcessed = await prisma.webhookEvent.findUnique({
    where: { paypalEventId: event.id },
  });

  if (alreadyProcessed) {
    logger.info('Duplicate webhook event ignored', { eventId: event.id });
    return res.status(200).json({ received: true, duplicate: true });
  }

  // --------------------------------------------------------
  // 3. Look up the related local payment (if any) via the
  //    PayPal order/capture id embedded in the resource.
  // --------------------------------------------------------
  const resource = event.resource || {};
  const orderId =
    resource.supplementary_data?.related_ids?.order_id || resource.id /* fallback for order events */;

  const relatedPayment = orderId
    ? await prisma.payment.findUnique({ where: { paypalOrderId: orderId } })
    : null;

  // Persist the event for audit/history regardless of outcome
  await prisma.webhookEvent.create({
    data: {
      paypalEventId: event.id,
      eventType: event.event_type,
      payload: event,
      paymentId: relatedPayment?.id,
    },
  });

  // --------------------------------------------------------
  // 4. React to the event type and update our local record.
  // --------------------------------------------------------
  if (relatedPayment) {
    const statusByEventType = {
      'PAYMENT.CAPTURE.COMPLETED': 'COMPLETED',
      'PAYMENT.CAPTURE.DENIED': 'DENIED',
      'PAYMENT.CAPTURE.REFUNDED': 'REFUNDED',
    };

    const newStatus = statusByEventType[event.event_type];

    if (newStatus) {
      await prisma.payment.update({
        where: { id: relatedPayment.id },
        data: { status: newStatus, rawCaptureResponse: event },
      });
    } else {
      logger.info('Unhandled webhook event type received', { eventType: event.event_type });
    }
  } else {
    logger.warn('Webhook event received for unknown payment', {
      eventType: event.event_type,
      orderId,
    });
  }

  await prisma.webhookEvent.update({
    where: { paypalEventId: event.id },
    data: { processed: true },
  });

  logger.info('Webhook processed', { eventType: event.event_type, eventId: event.id });

  // Always respond 200 quickly so PayPal doesn't retry unnecessarily
  return res.status(200).json({ received: true });
});
