# ─── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Build-time args (needed by Prisma config in prisma generate)
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

# Install dependencies (including dev for build tools)
COPY package*.json ./
RUN npm ci

# Copy source and configs needed for build
COPY tsconfig.json nest-cli.json ./
COPY prisma ./prisma
COPY src ./src
COPY locales ./locales

# Generate Prisma client + compile TypeScript
RUN npx prisma generate --schema=prisma/schema.prisma
RUN npm run build

# ─── Stage 2: Runner ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Runtime arg/env (optional but useful for prisma commands in CMD)
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Copy Prisma schema + generated client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/generated/prisma ./src/generated/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy i18n locale files
COPY --from=builder /app/locales ./locales

# Run as non-root for security
USER node

EXPOSE 5000

# Run migrations then start
CMD ["sh", "-lc", "npx prisma migrate deploy --schema=prisma/schema.prisma && exec node dist/src/main.js"]