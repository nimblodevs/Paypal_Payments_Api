// ============================================================
// PayPal Service
// Encapsulates all direct calls to PayPal. Controllers never
// talk to the PayPal SDK directly — they go through this
// service, which keeps API/business logic separated and makes
// the code testable/mockable.
//
// Uses @paypal/paypal-server-sdk's OrdersController for order
// creation/capture/lookup, and a direct REST call (via axios)
// for webhook signature verification, since that endpoint isn't
// wrapped by the SDK's typed controllers.
// ============================================================

import axios from 'axios';
import { OrdersController, CheckoutPaymentIntent } from '@paypal/paypal-server-sdk';
import { paypalClient } from '../config/paypal.js';
import env from '../config/env.js';
import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';

const ordersController = new OrdersController(paypalClient);

/**
 * Creates a PayPal order for the given amount/currency.
 * This is step 1 of the checkout flow — the returned order id
 * is what the frontend uses to render the PayPal buttons.
 */
export async function createOrder({ amount, currency, description, referenceId }) {
  const requestBody = {
    body: {
      intent: CheckoutPaymentIntent.Capture,
      purchaseUnits: [
        {
          referenceId: referenceId || undefined,
          description: description || undefined,
          amount: {
            currencyCode: currency || env.PAYPAL_CURRENCY,
            value: Number(amount).toFixed(2),
          },
        },
      ],
    },
    prefer: 'return=representation',
  };

  try {
    const { result } = await ordersController.createOrder(requestBody);
    return result;
  } catch (err) {
    logger.error('PayPal createOrder failed', { error: err.message });
    throw ApiError.badRequest('Unable to create PayPal order. Please verify the request and try again.');
  }
}

/**
 * Captures (finalizes) a previously approved PayPal order.
 * This is step 2 — called once the buyer has approved the
 * payment on PayPal's checkout UI.
 */
export async function captureOrder(paypalOrderId) {
  try {
    const { result } = await ordersController.captureOrder({
      id: paypalOrderId,
      prefer: 'return=representation',
    });
    return result;
  } catch (err) {
    logger.error('PayPal captureOrder failed', { paypalOrderId, error: err.message });
    throw ApiError.badRequest('Unable to capture PayPal order. It may have already been captured or expired.');
  }
}

/**
 * Fetches the current state of an order directly from PayPal —
 * useful for reconciliation / manual status checks.
 */
export async function getOrderDetails(paypalOrderId) {
  try {
    const { result } = await ordersController.getOrder({ id: paypalOrderId });
    return result;
  } catch (err) {
    logger.error('PayPal getOrderDetails failed', { paypalOrderId, error: err.message });
    throw ApiError.notFound('PayPal order not found');
  }
}

/**
 * Verifies that an incoming webhook actually came from PayPal
 * using PayPal's server-side signature verification API.
 * This is CRITICAL for security — without it, anyone could POST
 * fake "payment completed" events to your webhook endpoint.
 *
 * @param {object} headers - the raw Express request headers
 * @param {string} rawBody - the exact raw JSON string PayPal sent
 */
export async function verifyWebhookSignature(headers, rawBody) {
  if (!env.PAYPAL_WEBHOOK_ID) {
    logger.warn('PAYPAL_WEBHOOK_ID not configured — skipping webhook signature verification');
    return false;
  }

  const baseUrl =
    env.PAYPAL_MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

  // Get an OAuth2 access token to call PayPal's verification endpoint
  const tokenResponse = await axios.post(`${baseUrl}/v1/oauth2/token`, 'grant_type=client_credentials', {
    auth: { username: env.PAYPAL_CLIENT_ID, password: env.PAYPAL_CLIENT_SECRET },
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  const accessToken = tokenResponse.data.access_token;

  const verifyResponse = await axios.post(
    `${baseUrl}/v1/notifications/verify-webhook-signature`,
    {
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: env.PAYPAL_WEBHOOK_ID,
      webhook_event: JSON.parse(rawBody),
    },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  return verifyResponse.data.verification_status === 'SUCCESS';
}
