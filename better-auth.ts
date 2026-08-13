import 'dotenv/config';
import { parseAppConfig } from './src/config/app.config.js';
import { parseAuthConfig } from './src/config/auth.config.js';
import { parseDatabaseConfig } from './src/config/database.config.js';
import { parseHttpConfig } from './src/config/http.config.js';
import { createBetterAuth } from './src/modules/auth/better-auth.js';
import { PrismaService } from './src/persistence/prisma/prisma.service.js';

export const prisma = new PrismaService(parseDatabaseConfig());

// CLI processes never deliver mail: the admin bootstrap marks the address as
// verified itself, and the Prisma-backed CLI has no queue or template loader.
const cliEmailHooks = {
  sendResetPasswordEmail: async () => undefined,
  sendVerificationEmail: async () => undefined,
  sendChangeEmailConfirmation: async () => undefined,
};

const cliLogger = {
  error: () => undefined,
  warn: () => undefined,
  info: () => undefined,
  debug: () => undefined,
};

export const auth = createBetterAuth(
  prisma,
  parseAuthConfig(),
  parseAppConfig(),
  parseHttpConfig(),
  cliEmailHooks,
  cliLogger,
);
