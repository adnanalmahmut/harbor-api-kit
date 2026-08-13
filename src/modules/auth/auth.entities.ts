import { parseStoredRoles } from '#src/modules/authorization/permissions.catalog.js';

export class Session {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly expiresAt: Date,
    readonly ipAddress: string | null = null,
    readonly userAgent: string | null = null,
    readonly city: string | null = null,
    readonly country: string | null = null,
    readonly createdAt: Date = new Date(),
    readonly updatedAt: Date = new Date(),
    readonly token?: string,
  ) {}
}

/**
 * The session user as the guard exposes it on the request. It is a data shape,
 * not a behavioural entity: it round-trips through the session cache as plain
 * JSON, so it must not rely on methods or getters.
 */
export class User {
  constructor(
    readonly id: string,
    readonly email: string,
    readonly emailVerified: boolean,
    readonly name: string,
    readonly image: string = '',
    readonly locale: string | null = null,
    public roles: string[] = [],
    public permissions: string[] = [],
    readonly createdAt: Date = new Date(),
    readonly updatedAt: Date = new Date(),
  ) {}
}

/** Raw shape returned by BetterAuth API for user objects. */
export interface RawBetterAuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  image?: string | null;
  locale?: string | null;

  role?: string | null;

  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/** Raw shape returned by BetterAuth API for session objects. */
export interface RawBetterAuthSession {
  id: string;
  userId: string;
  expiresAt?: string | Date;
  ipAddress?: string | null;
  userAgent?: string | null;
  city?: string | null;
  country?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export function hydrateUser(raw: unknown): User {
  if (!raw) return null as unknown as User;
  const r = raw as RawBetterAuthUser;

  const { roles } = parseStoredRoles(r.role);

  return new User(
    r.id,
    r.email,
    r.emailVerified === true,
    r.name || '',
    r.image ?? '',
    r.locale || null,
    roles,
    [],
    r.createdAt ? new Date(r.createdAt) : new Date(),
    r.updatedAt ? new Date(r.updatedAt) : new Date(),
  );
}

export function hydrateSession(raw: unknown): Session {
  if (!raw) return null as unknown as Session;
  const r = raw as RawBetterAuthSession;
  return new Session(
    r.id,
    r.userId,
    r.expiresAt ? new Date(r.expiresAt) : new Date(),
    r.ipAddress || null,
    r.userAgent || null,
    r.city || null,
    r.country || null,
    r.createdAt ? new Date(r.createdAt) : new Date(),
    r.updatedAt ? new Date(r.updatedAt) : new Date(),
    undefined,
  );
}
