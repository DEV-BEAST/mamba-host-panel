# Base stage
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
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
RUN pnpm --filter @mambaPanel/web build

# Production stage
FROM base AS runner
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "apps/web/server.js"]
