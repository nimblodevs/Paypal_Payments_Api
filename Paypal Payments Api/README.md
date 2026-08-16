# PayPal Payments System for Business

A production-ready backend for accepting PayPal payments, built with **Node.js (ES Modules), Express 5, Prisma, and PostgreSQL**.

## What changed in this version

- **ES Modules everywhere** — `"type": "module"` in `package.json`, `import`/`export` throughout, no `require()`.
- **Express 5.2.1** — the framework's current stable "latest" release line (promise-aware routing, native ESM support).
- **`@paypal/paypal-server-sdk`** instead of the now-deprecated `@paypal/checkout-server-sdk`.
- **Prisma 6.19** and other dependencies bumped to their current stable major versions.
- Modern syntax throughout: `async`/`await`, optional chaining, class fields, arrow functions, template literals.
- Requires **Node.js 20+**.

## Features

- PayPal Orders v2 integration (create order → buyer approves → capture)
- Verified PayPal webhooks (signature verification + idempotent processing)
- JWT-based merchant authentication (register/login)
- Input validation on every endpoint (`express-validator`)
- Security hardening: `helmet`, CORS allow-list, rate limiting, HPP protection
- Structured logging with Winston — readable console logs in dev, rotating JSON files in production
- Centralized error handling with consistent JSON responses
- Prisma ORM + PostgreSQL with a clear, indexed schema
- Docker + docker-compose for one-command local/production stack
- Graceful shutdown and process-level crash safety nets

## Project Structure

```
paypal-payment-system/
├── prisma/
│   └── schema.prisma        # DB models: User, Payment, WebhookEvent
├── src/
│   ├── config/               # env, logger, prisma client, paypal client
│   ├── controllers/          # HTTP request handlers
│   ├── middlewares/          # auth, validation, rate limiting, error handling
│   ├── routes/                # Express routers
│   ├── services/               # business logic (PayPal API calls, DB access)
│   ├── validators/            # express-validator rule sets
│   ├── utils/                  # ApiError, ApiResponse, asyncHandler
│   ├── app.js                  # Express app (middleware + routes)
│   └── server.js               # process entrypoint, graceful shutdown
├── eslint.config.js           # ESLint 9 flat config
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── package.json                # "type": "module"
```

## Getting Started

### 1. Prerequisites
- Node.js 20+
- PostgreSQL 14+ (or use the included `docker-compose.yml`)
- A PayPal Developer account: https://developer.paypal.com/dashboard/applications

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
# then edit .env with your PayPal sandbox credentials and DB URL
```

### 4. Set up the database
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Run the app
```bash
npm run dev     # development, with nodemon auto-reload
npm start       # production
```

The API will be available at `http://localhost:4000`.

### Running with Docker
```bash
docker compose up --build
```

## API Overview

All endpoints are prefixed with `/api/v1`.

| Method | Endpoint                        | Auth required | Description                          |
|--------|----------------------------------|----------------|---------------------------------------|
| POST   | `/auth/register`                | No             | Create a merchant account            |
| POST   | `/auth/login`                   | No             | Log in, receive a JWT                |
| POST   | `/payments/create-order`        | No             | Create a PayPal order                |
| POST   | `/payments/:orderId/capture`    | No             | Capture an approved order            |
| GET    | `/payments/:orderId`            | No             | Get a payment's current status       |
| GET    | `/payments`                     | Yes (JWT)      | List/paginate your payments          |
| POST   | `/webhooks/paypal`              | PayPal signature | Receives PayPal webhook events    |
| GET    | `/health`                       | No             | Health check                         |

### Example: create an order
```bash
curl -X POST http://localhost:4000/api/v1/payments/create-order \
  -H "Content-Type: application/json" \
  -d '{"amount": 49.99, "currency": "USD", "description": "Order #1234"}'
```

### Example: capture an order
```bash
curl -X POST http://localhost:4000/api/v1/payments/<paypalOrderId>/capture
```

## Setting Up PayPal Webhooks

1. In the PayPal Developer Dashboard, open your app and add a webhook pointing to:
   `https://your-domain.com/api/v1/webhooks/paypal`
2. Subscribe at least to: `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.REFUNDED`
3. Copy the generated **Webhook ID** into `PAYPAL_WEBHOOK_ID` in your `.env`

Webhooks are the authoritative source of truth for payment state in production — always rely on them (not just the client-triggered capture call) to mark orders as paid, since a client-side capture request can fail to reach your server even after PayPal has processed the payment.

## Security Notes

- Never commit your `.env` file — it holds PayPal secrets and JWT signing keys.
- Rotate `JWT_SECRET` and PayPal credentials periodically.
- In production, put this app behind HTTPS (e.g. via a reverse proxy/load balancer) — PayPal requires HTTPS webhook URLs.
- The `CORS_ORIGIN` env var should list your real frontend domain(s) in production — avoid `*`.
- Webhook signature verification is enforced whenever `PAYPAL_WEBHOOK_ID` is set; do not leave it empty in production.

## Logging

- **Development**: colorized, human-readable console logs.
- **Production**: structured JSON logs written to `logs/application-YYYY-MM-DD.log` (rotated daily, kept 14 days) and `logs/error-YYYY-MM-DD.log` (kept 30 days), plus console output for container log collectors.

## A note on dependency freshness

This project pins to current stable major versions as of this writing (Prisma 6.x, Express 5.x, `@paypal/paypal-server-sdk` 2.x). Run `npm outdated` periodically and consult each package's changelog before bumping majors — in particular, Prisma 7 introduces a new config-file-based workflow (`prisma.config.ts`) and driver-adapter model that is a bigger migration than a routine `npm update`.

## License

MIT
