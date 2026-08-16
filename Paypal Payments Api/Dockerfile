# ============================================================
# Production Dockerfile — multi-stage build for a small final image
# ============================================================

FROM node:22-alpine AS base
WORKDIR /usr/src/app

# Install dependencies (cached separately from source for faster rebuilds)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source and Prisma schema, then generate the Prisma client
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src

# Run as a non-root user for better container security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 4000

# Apply pending migrations, then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
