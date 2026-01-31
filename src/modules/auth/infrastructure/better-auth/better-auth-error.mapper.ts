// better-auth-error.mapper.ts
import { ValidationError } from '#src/core/exceptions/validation.exception.js';
import type { ValidationIssue } from '#src/core/types/api.types.js';
import { Prisma } from '#src/generated/prisma/client.js';
import { AuthException } from '#src/modules/auth/domain/exceptions/auth.exception.js';
import { BETTER_AUTH_CODE_MAP } from '#src/modules/auth/infrastructure/better-auth/better-auth-code-map.js';

type ApiErrorLike = {
  name?: string;
  status?: string;
  statusCode?: number;
  body?: any; // لأن مزودات الأخطاء تختلف
  message?: string;
};

function isBetterAuthApiError(e: unknown): e is ApiErrorLike {
  const x = e as any;
  return !!x && (x?.name === 'APIError' || typeof x?.statusCode === 'number');
}

function isPrismaKnown(e: unknown): e is Prisma.PrismaClientKnownRequestError {
  return e instanceof Prisma.PrismaClientKnownRequestError;
}

function pickProviderErrors(body: any): unknown {
  if (!body || typeof body !== 'object') return null;

  // أكثر مسارات شائعة
  return (
    body.errors ??
    body.error?.errors ??
    body.error?.issues ??
    body.details?.errors ??
    body.data?.errors ??
    null
  );
}

/**
 * حسب مشروعك:
 * ValidationIssue = { path: string; message: string }
 * و translateIfKey سيترجم message إذا كانت Key موجودة.
 */
function normalizeBetterAuthValidationErrors(
  input: unknown,
): ValidationIssue[] | null {
  if (!input) return null;

  // شكل: [{ path: 'email', message: 'Invalid email' }]
  if (Array.isArray(input)) {
    const issues: ValidationIssue[] = [];

    for (const e of input) {
      const field = e?.path ?? e?.field ?? e?.key;
      const msg = e?.message ?? e?.msg ?? e?.code;
      if (!field) continue;

      if (String(field) === 'email') {
        issues.push({
          path: 'email',
          message: 'auth.errors.validation.email.invalid',
        });
        continue;
      }

      issues.push({
        path: String(field),
        message: typeof msg === 'string' ? msg : 'errors.common.bad_request',
      });
    }

    return issues.length ? issues : null;
  }

  // شكل: { email: ['Invalid email'] } أو { fieldErrors: { email: ['Invalid email'] } }
  if (typeof input === 'object') {
    const obj = input as any;
    const fieldErrors = obj.fieldErrors ?? obj.errors ?? obj;

    if (fieldErrors && typeof fieldErrors === 'object') {
      const issues: ValidationIssue[] = [];

      for (const [field, messages] of Object.entries(fieldErrors)) {
        if (String(field) === 'email') {
          issues.push({
            path: 'email',
            message: 'auth.errors.validation.email.invalid',
          });
          continue;
        }

        const first =
          Array.isArray(messages) && typeof messages[0] === 'string'
            ? messages[0]
            : null;

        issues.push({
          path: String(field),
          message: first ?? 'errors.common.bad_request',
        });
      }

      return issues.length ? issues : null;
    }
  }

  return null;
}

function inferIssuesFromMessage(
  providerMessage: unknown,
  providerCode?: string | null,
): ValidationIssue[] | null {
  const msg = typeof providerMessage === 'string' ? providerMessage : '';
  const code = providerCode ?? '';

  const hay = `${code} ${msg}`.toLowerCase();

  // قواعد استنتاج عملية (عدّلها حسب رسائل BetterAuth عندك)
  if (
    hay.includes('email') &&
    (hay.includes('invalid') ||
      hay.includes('not valid') ||
      hay.includes('malformed') ||
      hay.includes('format'))
  ) {
    return [{ path: 'email', message: 'auth.errors.validation.email.invalid' }];
  }

  return null;
}

export function mapBetterAuthError(err: unknown): never {
  // 1) Better Auth APIError-like
  if (isBetterAuthApiError(err)) {
    const body = err.body ?? {};
    const providerCode = body?.code ?? null;
    const providerMessage = body?.message ?? err.message ?? null;
    const msgLower = String(providerMessage || '').toLowerCase();

    // Catch specific password/credential errors that might be misidentified as validation
    if (
      msgLower.includes('invalid email or password') ||
      msgLower.includes('incorrect password') ||
      msgLower.includes('password is incorrect')
    ) {
      throw AuthException.invalidCredentials();
    }

    // mapping مباشر عبر الكود إن توفر
    if (providerCode && BETTER_AUTH_CODE_MAP[providerCode]) {
      throw BETTER_AUTH_CODE_MAP[providerCode]();
    }

    // بعض المزودات ترجع 200 مع أخطاء -> نعتبرها 422
    const rawStatus = Number(err.statusCode);
    const status = rawStatus >= 400 ? rawStatus : 422;

    const providerErrors = pickProviderErrors(body);

    // 1) لو عندنا providerErrors -> حوّلها إلى ValidationError
    const issuesFromErrors =
      normalizeBetterAuthValidationErrors(providerErrors);
    if (issuesFromErrors?.length) {
      throw new ValidationError('errors.common.bad_request', issuesFromErrors);
    }

    // 2) لو ما عندنا errors لكن الرسالة توضّح السبب -> استنتج Issues وارمِ ValidationError
    const issuesFromMsg = inferIssuesFromMessage(providerMessage, providerCode);
    if (issuesFromMsg?.length) {
      throw new ValidationError('errors.common.bad_request', issuesFromMsg);
    }

    // fallback: AppException عام
    // fallback: AuthException based on status
    if (status >= 500) throw AuthException.internalError();
    if (status === 409) throw AuthException.conflict();
    if (status === 401) throw AuthException.authenticationRequired();
    if (status === 403) throw AuthException.emailNotVerified(); // Common case for 403 in auth

    throw AuthException.invalidRequest();
  }

  // 2) Prisma errors
  if (isPrismaKnown(err)) {
    if (err.code === 'P2002') throw AuthException.conflict();
    if (err.code === 'P2025') throw AuthException.notFound();

    throw AuthException.internalError();
  }

  // 3) fallback
  throw AuthException.internalError();
}
