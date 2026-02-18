/**
 * Validates that a redirect/callback URL targets only allowed domains.
 * Prevents open-redirect attacks via user-supplied `callbackURL`.
 */
export function assertAllowedRedirectURL(
  url: string | undefined,
  allowedOrigins: string[],
): void {
  if (!url) return; // field is optional — nothing to check

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new InvalidRedirectURLError(url);
  }

  // Only allow http(s) schemes
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new InvalidRedirectURLError(url);
  }

  const allowedHostnames = allowedOrigins
    .map((o) => {
      try {
        return new URL(o).hostname;
      } catch {
        return null;
      }
    })
    .filter((h): h is string => h !== null);

  const isAllowed = allowedHostnames.some(
    (domain) =>
      parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`),
  );

  if (!isAllowed) {
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
