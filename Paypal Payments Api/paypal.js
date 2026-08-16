// ============================================================
// PayPal Server SDK Client
//
// Uses the current @paypal/paypal-server-sdk package. The older
// @paypal/checkout-server-sdk is deprecated by PayPal in favor
// of this one, which authenticates via OAuth2 client-credentials
// automatically on the first API call — there's no separate
// "get an access token" step to manage yourself.
// ============================================================

import { Client, Environment, LogLevel } from '@paypal/paypal-server-sdk';
import env from './env.js';

export const paypalClient = new Client({
  clientCredentialsAuthCredentials: {
    oAuthClientId: env.PAYPAL_CLIENT_ID,
    oAuthClientSecret: env.PAYPAL_CLIENT_SECRET,
  },
  timeout: 0,
  environment: env.PAYPAL_MODE === 'live' ? Environment.Production : Environment.Sandbox,
  // Keep SDK-level request/response logging quiet in production;
  // our own Winston logger covers what we need in the services layer.
  logging: {
    logLevel: env.isProduction ? LogLevel.Warn : LogLevel.Info,
    logRequest: { logBody: false },
    logResponse: { logHeaders: false },
  },
});
