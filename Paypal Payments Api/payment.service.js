// ============================================================
// Payment Service
// Handles all database persistence related to Payment records.
// Keeping this separate from the controller keeps controllers
// thin and makes the persistence logic reusable/testable.
// ============================================================

import prisma from '../config/prisma.js';

export async function createPaymentRecord({
  paypalOrderId,
  amount,
  currency,
  description,
  referenceId,
  userId,
  rawCreateResponse,
}) {
  return prisma.payment.create({
    data: {
      paypalOrderId,
      amount,
      currency,
      description,
      referenceId,
      userId,
      status: 'CREATED',
      rawCreateResponse,
    },
  });
}

export async function markApproved(paypalOrderId, rawResponse) {
  return prisma.payment.update({
    where: { paypalOrderId },
    data: { status: 'APPROVED', rawCreateResponse: rawResponse },
  });
}

export async function markCompleted(paypalOrderId, captureResult) {
  const capture = captureResult?.purchaseUnits?.[0]?.payments?.captures?.[0];
  const payer = captureResult?.payer;

  return prisma.payment.update({
    where: { paypalOrderId },
    data: {
      status: 'COMPLETED',
      paypalCaptureId: capture?.id,
      payerEmail: payer?.emailAddress,
      payerId: payer?.payerId,
      rawCaptureResponse: captureResult,
    },
  });
}

export async function markFailed(paypalOrderId, reason) {
  return prisma.payment.update({
    where: { paypalOrderId },
    data: { status: 'FAILED', failureReason: reason },
  });
}

export async function findByOrderId(paypalOrderId) {
  return prisma.payment.findUnique({ where: { paypalOrderId } });
}

export async function listPayments({ page = 1, limit = 20, status, userId }) {
  const where = {
    ...(status ? { status } : {}),
    ...(userId ? { userId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
