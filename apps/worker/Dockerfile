# Base stage
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/types/package.json ./packages/types/
COPY packages/db/package.json ./packages/db/
COPY packages/config/package.json ./packages/config/
COPY packages/api-types/package.json ./packages/api-types/
COPY packages/ui/package.json ./packages/ui/
COPY packages/alloc/package.json ./packages/alloc/
COPY packages/audit/package.json ./packages/audit/
COPY packages/authz/package.json ./packages/authz/
COPY packages/billing/package.json ./packages/billing/
COPY packages/blueprints/package.json ./packages/blueprints/
COPY packages/metrics-sdk/package.json ./packages/metrics-sdk/
COPY packages/notifications/package.json ./packages/notifications/
COPY packages/security/package.json ./packages/security/
RUN pnpm install --frozen-lockfile

# Builder stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @mambaPanel/worker build

# Production stage
FROM base AS runner
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/apps/worker/package.json ./apps/worker/
COPY --from=builder /app/packages ./packages

USER nestjs

CMD ["node", "apps/worker/dist/main.js"]
