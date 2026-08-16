// ============================================================
// Payment Controller
// HTTP layer that ties together the PayPal service (talks to
// PayPal) and the Payment service (persists to Postgres).
// ============================================================

import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import * as paypalService from '../services/paypal.service.js';
import * as paymentService from '../services/payment.service.js';
import logger from '../config/logger.js';

// ------------------------------------------------------------
// POST /api/v1/payments/create-order
// Creates a PayPal order and stores a local CREATED record.
// ------------------------------------------------------------
export const createOrder = asyncHandler(async (req, res) => {
  const { amount, currency, description, referenceId } = req.body;

  const paypalOrder = await paypalService.createOrder({ amount, currency, description, referenceId });

  const payment = await paymentService.createPaymentRecord({
    paypalOrderId: paypalOrder.id,
    amount,
    currency: currency || undefined,
    description,
    referenceId,
    userId: req.user?.id, // optional — set if the request was authenticated
    rawCreateResponse: paypalOrder,
  });

  logger.info('Payment order created', { paymentId: payment.id, paypalOrderId: paypalOrder.id, amount });

  // Extract the "approve" link the frontend needs to redirect the buyer to
  const approveLink = paypalOrder.links?.find((link) => link.rel === 'approve')?.href;

  return new ApiResponse(
    201,
    { paypalOrderId: paypalOrder.id, status: paypalOrder.status, approveLink, payment },
    'Order created successfully'
  ).send(res);
});

// ------------------------------------------------------------
// POST /api/v1/payments/:orderId/capture
// Captures a previously approved order and updates our record.
// ------------------------------------------------------------
export const captureOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const existing = await paymentService.findByOrderId(orderId);
  if (!existing) {
    throw ApiError.notFound('No payment found for this order id');
  }

  // Prevent double-capture attempts against PayPal
  if (existing.status === 'COMPLETED') {
    return new ApiResponse(200, existing, 'Order was already captured').send(res);
  }

  let captureResult;
  try {
    captureResult = await paypalService.captureOrder(orderId);
  } catch (err) {
    await paymentService.markFailed(orderId, err.message);
    throw err;
  }

  const { status } = captureResult; // e.g. "COMPLETED"
  let updated;

  if (status === 'COMPLETED') {
    updated = await paymentService.markCompleted(orderId, captureResult);
    logger.info('Payment captured successfully', { paypalOrderId: orderId, paymentId: updated.id });
  } else {
    updated = await paymentService.markFailed(orderId, `Unexpected capture status: ${status}`);
    logger.warn('Payment capture returned non-completed status', { paypalOrderId: orderId, status });
  }

  return new ApiResponse(200, updated, 'Order capture processed').send(res);
});

// ------------------------------------------------------------
// GET /api/v1/payments/:orderId
// Returns the local payment record for a given PayPal order id.
// ------------------------------------------------------------
export const getPayment = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const payment = await paymentService.findByOrderId(orderId);

  if (!payment) {
    throw ApiError.notFound('No payment found for this order id');
  }

  return new ApiResponse(200, payment, 'Payment retrieved').send(res);
});

// ------------------------------------------------------------
// GET /api/v1/payments
// Lists payments with pagination and optional status filter.
// Protected route — merchants only see their own payments unless admin.
// ------------------------------------------------------------
export const listPayments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;

  const scopeToOwnPayments = req.user.role !== 'ADMIN';
  const result = await paymentService.listPayments({
    page,
    limit,
    status,
    userId: scopeToOwnPayments ? req.user.id : undefined,
  });

  return new ApiResponse(200, result, 'Payments retrieved').send(res);
});
