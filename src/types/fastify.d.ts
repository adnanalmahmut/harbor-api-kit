import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    cookies?: Record<string, string | undefined>;
    user?: RequestUser;
    session?: RequestSession;
  }
}

interface RequestUser {
  id: string;
}

interface RequestSession {
  sid: string;
}
