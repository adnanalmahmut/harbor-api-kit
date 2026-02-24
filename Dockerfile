# ─── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Prisma on Alpine often needs openssl
RUN apk add --no-cache openssl

# Install dependencies (including dev for build tools)
COPY package*.json ./
RUN npm ci

# Copy source and configs needed for build
COPY tsconfig.json tsconfig.build.json nest-cli.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
COPY locales ./locales

# Generate Prisma client + compile TypeScript
RUN npx prisma generate
RUN npm run build

# ─── Stage 2: Runner ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Runtime deps for Prisma engine
RUN apk add --no-cache openssl

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled app
COPY --from=builder /app/dist ./dist

# Copy Prisma assets/config
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src/generated/prisma ./src/generated/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# If `prisma` CLI is in devDependencies, uncomment the next 2 lines
# COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
# COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma

# Copy i18n locale files
COPY --from=builder /app/locales ./locales

# Run as non-root for security
USER node

EXPOSE 5000

# Run migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]