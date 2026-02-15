import { AppException } from '#src/core/domain/exceptions/app-exception.js';
import { AppErrorCode } from '#src/core/domain/exceptions/error-definitions.js';
import type { RequestContextStorePort } from '#src/core/domain/ports/request-context.store.port.js';

export function getTenantId(
  contextStore: RequestContextStorePort,
): string | undefined {
  return contextStore.get()?.tenantId;
}

export function requireTenantId(contextStore: RequestContextStorePort): string {
  const t = getTenantId(contextStore);
  if (!t)
    throw new AppException({
      code: AppErrorCode.BAD_REQUEST,
      messageKey: 'core.errors.common.validation',
      details: { reason: 'Missing tenantId in context' },
    });
  return t;
}
