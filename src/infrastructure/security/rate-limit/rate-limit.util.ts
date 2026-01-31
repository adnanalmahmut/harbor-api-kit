import type { FastifyRequest } from 'fastify';

export function pickClientKey(
  req: FastifyRequest,
  strategy: 'ip' | 'userId' | 'sid' | 'hybrid',
) {
  if (strategy === 'userId' && req.user?.id) return `user:${req.user.id}`;
  if (strategy === 'sid' && req.session?.id) return `sid:${req.session.id}`;

  if (strategy === 'hybrid') {
    const ip = req.ip || 'unknown';
    return req.user?.id ? `user:${req.user.id}:ip:${ip}` : `ip:${ip}`;
  }

  const ip = req.ip || 'unknown';
  return `ip:${ip}`;
}
