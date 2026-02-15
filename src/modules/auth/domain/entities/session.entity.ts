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
