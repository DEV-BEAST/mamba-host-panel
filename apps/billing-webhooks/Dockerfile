# Base stage
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/billing-webhooks/package.json ./apps/billing-webhooks/
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
RUN pnpm --filter @mambaPanel/billing-webhooks build

# Production stage
FROM base AS runner
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 node

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/billing-webhooks/dist ./apps/billing-webhooks/dist
COPY --from=builder /app/apps/billing-webhooks/package.json ./apps/billing-webhooks/
COPY --from=builder /app/packages ./packages

USER node

EXPOSE 3002

ENV PORT 3002

CMD ["node", "apps/billing-webhooks/dist/index.js"]
