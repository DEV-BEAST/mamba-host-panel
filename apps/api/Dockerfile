# Base stage
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/db/package.json ./packages/db/
COPY packages/config/package.json ./packages/config/
RUN pnpm install --frozen-lockfile

# Builder stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @gamePanel/api build

# Production stage
FROM base AS runner
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/packages ./packages

USER nestjs

EXPOSE 3001

ENV PORT 3001

CMD ["node", "apps/api/dist/main.js"]
