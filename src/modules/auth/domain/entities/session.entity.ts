export class SessionEntity {
  constructor(
    readonly sid: string,
    readonly userId: string,
    readonly refreshTokenHash: string,
    readonly familyId: string,
    readonly parentId: string | null,
    readonly expiresAt: Date,
    readonly rotatedAt: Date | null,
    readonly revokedAt: Date | null,
    readonly lastUsedAt: Date | null,
    readonly ipHash: string | null,
    readonly uaHash: string | null,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}
}
