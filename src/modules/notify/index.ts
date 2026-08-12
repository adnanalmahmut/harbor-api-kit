// Public API of the Notify module.
// Cross-module consumers MUST import from this barrel only.
// Internal notify-module code uses relative imports.

// NestJS module class is NOT re-exported — consuming .module.ts files
// import it directly from './notify.module.js' to avoid circular barrel deps.

// Domain ports — abstract classes used as Nest injection tokens, so they MUST
// be re-exported as runtime symbols, not type-only.
export { EmailProviderPort } from './domain/email.provider.port.js';
export type { SendEmailParams } from './domain/email.provider.port.js';

// Authentication emails: callers name what happened, this module owns the
// template, the subject translation, the retry policy and the failure policy.
export { AuthEmailPort } from './domain/auth-email.port.js';
export type {
  AuthEmailKind,
  SendAuthEmailParams,
} from './domain/auth-email.port.js';
