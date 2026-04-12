import { CORE_TOKENS, RequestContextStoreAdapter } from '#src/core/index.js';
import { AUTH_TOKENS } from '#src/modules/auth/auth.tokens.js';
import {
  AuthConfigAdapter,
  AuthEmailHooks,
  BetterAuthProvider,
  InfraCurrentSessionProvider,
  RedisSessionTrackerAdapter,
} from '#src/modules/auth/infrastructure/index.js';
import { AuthGuard } from '#src/modules/auth/presentation/index.js';
import type { Provider } from '@nestjs/common';

export const authBindings: Provider[] = [
  AuthGuard,
  AuthEmailHooks,
  { provide: AUTH_TOKENS.AUTH_PROVIDER, useClass: BetterAuthProvider },
  { provide: AUTH_TOKENS.AUTH_EMAIL_SENDER, useExisting: AuthEmailHooks },
  {
    provide: AUTH_TOKENS.CURRENT_SESSION_PROVIDER,
    useClass: InfraCurrentSessionProvider,
  },
  {
    provide: CORE_TOKENS.REQUEST_CONTEXT_STORE,
    useClass: RequestContextStoreAdapter,
  },
  {
    provide: AUTH_TOKENS.AUTH_CONFIG,
    useClass: AuthConfigAdapter,
  },
  {
    provide: AUTH_TOKENS.SESSION_TRACKER,
    useClass: RedisSessionTrackerAdapter,
  },
];
