import type { FastifyRequest } from 'fastify';

/**
 * Get real client IP address, handling proxies and load balancers.
 * Checks X-Forwarded-For and X-Real-IP headers before falling back to req.ip
 */
export function getRealIp(req: FastifyRequest): string {
  // X-Forwarded-For: client, proxy1, proxy2 (first is real client)
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    const first = Array.isArray(xForwardedFor)
      ? xForwardedFor[0]
      : xForwardedFor.split(',')[0];
    const ip = first?.trim();
    if (ip) return ip;
  }

  // X-Real-IP: set by nginx/reverse proxies
  const xRealIp = req.headers['x-real-ip'];
  if (xRealIp) {
    const ip = Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;
    if (ip) return ip.trim();
  }

  // Fallback to Fastify's detected IP
  return req.ip || 'unknown';
}
