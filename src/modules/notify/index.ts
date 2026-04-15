// Public API of the Notify module.
// Cross-module consumers MUST import from this barrel only.
// Internal notify-module code uses relative imports.

// NestJS module class is NOT re-exported — consuming .module.ts files
// import it directly from './notify.module.js' to avoid circular barrel deps.

// Domain port — consumed by Auth (and any future module enqueuing emails).
// EmailProviderPort is an abstract class (used as Nest injection token), so it
// MUST be re-exported as a runtime symbol, not type-only.
export { EmailProviderPort } from './domain/email.provider.port.js';
export type { SendEmailParams } from './domain/email.provider.port.js';
