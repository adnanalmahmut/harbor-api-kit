/**
 * Validates that a redirect/callback URL targets only allowed domains.
 * Prevents open-redirect attacks via user-supplied `callbackURL`.
 */
export function assertAllowedRedirectURL(
  url: string | undefined,
  allowedOrigins: readonly string[],
): void {
  if (!url) return;

  const u = url.trim();
  // Allow only safe relative paths, disallow scheme-relative URLs like //evil.com
  if (u.startsWith('/') && !u.startsWith('//')) return;
  if (u.startsWith('//') || u.startsWith('\\')) {
    throw new InvalidRedirectURLError(url);
  }

  let parsed: URL;
  try {
    parsed = new URL(u);
  } catch {
    throw new InvalidRedirectURLError(url);
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new InvalidRedirectURLError(url);
  }

  if (parsed.username || parsed.password) {
    throw new InvalidRedirectURLError(url);
  }

  const allowed = new Set(allowedOrigins);

  if (!allowed.has(parsed.origin)) {
    throw new InvalidRedirectURLError(url);
  }
}

/**
 * Lightweight error class used by the validation utility.
 * Caught and re-thrown as the appropriate AppException in the calling layer.
 */
export class InvalidRedirectURLError extends Error {
  constructor(public readonly url: string) {
    super(`Redirect URL not allowed: ${url}`);
    this.name = 'InvalidRedirectURLError';
  }
}
