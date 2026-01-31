import type { RequestContext } from '#src/core/context/request-context.type.js';
import { redisKeys } from '#src/infrastructure/redis/redis.keys.js';
import type { AuthProviderPort } from '../ports/auth-provider.port.js';
import type { AuthResult } from '../ports/auth-result.js';

export class RevokeSessionUseCase {
  constructor(private readonly authProvider: AuthProviderPort) {}

  async execute(
    token: string,
    context: RequestContext,
  ): Promise<AuthResult<void>> {
    if (context.redis) {
      await context.redis.del(redisKeys.session(token));
    }
    return this.authProvider.revokeSession(token, context);
  }
}
