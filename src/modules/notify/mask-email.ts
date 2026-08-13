/**
 * Log-safe rendering of an address. Every log line in this module goes through
 * it — a raw recipient address must never reach the log stream.
 */
export function maskEmail(email: string): string {
  const [localPart = '', domain = ''] = email.split('@');
  if (!domain) return '[invalid-email]';

  const localMasked =
    localPart.length <= 2
      ? `${localPart[0] ?? '*'}*`
      : `${localPart.slice(0, 2)}***`;

  const domainParts = domain.split('.');
  const domainName = domainParts[0] ?? '';
  const tld = domainParts.slice(1).join('.') || '';

  const domainMasked =
    domainName.length <= 2
      ? `${domainName[0] ?? '*'}*`
      : `${domainName.slice(0, 2)}***`;

  return tld
    ? `${localMasked}@${domainMasked}.${tld}`
    : `${localMasked}@${domainMasked}`;
}
