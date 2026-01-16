import type { FastifyRequest } from 'fastify';

export function pickClientKey(
  req: FastifyRequest,
  strategy: 'ip' | 'userId' | 'sid',
) {
  if (strategy === 'userId' && req.user?.id) return `user:${req.user.id}`;
  if (strategy === 'sid' && req.session?.sid) return `sid:${req.session.sid}`;

  const ip = req.ip || 'unknown';
  return `ip:${ip}`;
}
