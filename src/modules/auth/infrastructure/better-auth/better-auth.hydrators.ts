import { LinkedAccount, Session, User } from '../../domain/index.js';
import { safeJsonParse } from './better-auth.helpers.js';

/** Raw shape returned by BetterAuth API for user objects. */
export interface RawBetterAuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  image?: string | null;
  locale?: string | null;

  // stored as string in better-auth additionalFields
  roles?: string | null;
  permissions?: string | null;

  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
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

/** Raw shape for linked account data. */
export interface RawBetterAuthLinkedAccount {
  id: string;
  provider: string;
  providerId: string;
  accountId: string;
  createdAt?: string | Date;
}

export function hydrateUser(raw: unknown): User {
  if (!raw) return null as unknown as User;
  const r = raw as RawBetterAuthUser;

  const roles = safeJsonParse<string[]>(r.roles, []);
  const permissions = safeJsonParse<string[]>(r.permissions, []);

  return new User(
    r.id,
    r.email,
    r.emailVerified === true,
    r.name || '',
    r.firstName || null,
    r.lastName || null,
    r.image ?? '',
    r.locale || null,
    roles,
    permissions,
    r.createdAt ? new Date(r.createdAt) : new Date(),
    r.updatedAt ? new Date(r.updatedAt) : new Date(),
    r.deletedAt ? new Date(r.deletedAt) : null,
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

export function hydrateLinkedAccount(raw: unknown): LinkedAccount {
  if (!raw) return null as unknown as LinkedAccount;
  const r = raw as RawBetterAuthLinkedAccount;
  return new LinkedAccount(
    r.id,
    r.provider,
    r.providerId,
    r.accountId,
    r.createdAt ? new Date(r.createdAt) : new Date(),
  );
}
