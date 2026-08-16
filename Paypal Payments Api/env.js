// ============================================================
// Environment Configuration
// Loads .env and validates every required variable up front.
// Failing fast here prevents the app from booting with a
// missing PayPal secret or DB URL and failing confusingly later.
// ============================================================

import dotenv from 'dotenv';
import { cleanEnv, str, port, num } from 'envalid';

dotenv.config();

const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'production', 'test'], default: 'development' }),
  PORT: port({ default: 4000 }),
  APP_NAME: str({ default: 'PayPal Payments System' }),
  CORS_ORIGIN: str({ default: '*' }),

  DATABASE_URL: str(),

  PAYPAL_CLIENT_ID: str(),
  PAYPAL_CLIENT_SECRET: str(),
  PAYPAL_MODE: str({ choices: ['sandbox', 'live'], default: 'sandbox' }),
  PAYPAL_WEBHOOK_ID: str({ default: '' }),
  PAYPAL_CURRENCY: str({ default: 'USD' }),

  JWT_SECRET: str(),
  JWT_EXPIRES_IN: str({ default: '1d' }),

  RATE_LIMIT_WINDOW_MS: num({ default: 900000 }),
  RATE_LIMIT_MAX: num({ default: 100 }),

  LOG_LEVEL: str({ default: 'info' }),
});

export default env;
