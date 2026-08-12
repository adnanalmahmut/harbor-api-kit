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
