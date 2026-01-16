import { SessionEntity } from '#src/modules/auth/domain/entities/session.entity.js';

export type PrismaSessionRecord = {
  sid: string;
  userId: string;
  refreshTokenHash: string;
  familyId: string;
  parentId: string | null;
  expiresAt: Date;
  rotatedAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  ipHash: string | null;
  uaHash: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function mapPrismaSessionToEntity(
  row: PrismaSessionRecord,
): SessionEntity {
  return new SessionEntity(
    row.sid,
    row.userId,
    row.refreshTokenHash,
    row.familyId,
    row.parentId,
    row.expiresAt,
    row.rotatedAt,
    row.revokedAt,
    row.lastUsedAt,
    row.ipHash,
    row.uaHash,
    row.createdAt,
    row.updatedAt,
  );
}
