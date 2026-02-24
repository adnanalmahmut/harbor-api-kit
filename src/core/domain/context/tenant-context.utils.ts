import { AppException } from '../exceptions/app-exception.js';
import { AppErrorCode } from '../exceptions/error-definitions.js';
import type { RequestContextStorePort } from '../ports/request-context.store.port.js';

/**
 * Tenant resolution helpers.
 * Source of truth: RequestContext. Multi-tenant flows should use requireTenantId()
 * when tenant is mandatory for authorization/data isolation.
 */
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
