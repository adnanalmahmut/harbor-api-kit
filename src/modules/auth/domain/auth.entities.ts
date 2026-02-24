export class LinkedAccount {
  constructor(
    readonly id: string,
    readonly provider: string,
    readonly providerId: string,
    readonly accountId: string,
    readonly createdAt: Date = new Date(),
  ) {}
}

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

  get isExpired(): boolean {
    return this.expiresAt < new Date();
  }
}

export class User {
  constructor(
    readonly id: string,
    readonly email: string,
    readonly emailVerified: boolean,
    readonly name: string,
    readonly firstName: string | null = null,
    readonly lastName: string | null = null,
    readonly image: string | null = null,
    readonly locale: string | null = null,
    public roles: string[] = [],
    public permissions: string[] = [],
    readonly createdAt: Date = new Date(),
    readonly updatedAt: Date = new Date(),
    readonly deletedAt: Date | null = null,
  ) {}

  get fullName(): string {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    }
    return this.name;
  }

  get isActive(): boolean {
    return !this.deletedAt;
  }

  get canLogin(): boolean {
    return this.isActive;
  }
}
