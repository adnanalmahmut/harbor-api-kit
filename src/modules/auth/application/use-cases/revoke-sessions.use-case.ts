import type { RequestContext } from '#src/core/context/request-context.type.js';
import { redisKeys } from '#src/infrastructure/redis/redis.keys.js';
import type { AuthProviderPort } from '../ports/auth-provider.port.js';
import type { AuthResult } from '../ports/auth-result.js';

export class RevokeSessionsUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(
    tokens: string[],
    context: RequestContext,
  ): Promise<AuthResult<void>> {
    const redis = context.redis;
    if (redis) {
      // Best effort invalidation
      await Promise.allSettled(
        tokens.map((token) => redis.del(redisKeys.session(token))),
      );
    }
    return this.authProvider.revokeSessions(tokens, context);
  }
}
