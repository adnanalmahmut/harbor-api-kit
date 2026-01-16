import type { SessionEntity } from '#src/modules/auth/domain/entities/session.entity.js';

export type CreateSessionData = {
  sid: string;
  userId: string;
  refreshTokenHash: string;
  familyId: string;
  parentId?: string | null;
  expiresAt: Date;
  ipHash?: string | null;
  uaHash?: string | null;
};

export interface SessionRepositoryPort {
  create(data: CreateSessionData): Promise<SessionEntity>;
  findBySid(sid: string): Promise<SessionEntity | null>;
  findByRefreshTokenHash(hash: string): Promise<SessionEntity | null>;

  updateLastUsedAt(sid: string, at: Date): Promise<void>;

  rotate(params: {
    sid: string;
    newSid: string;
    newRefreshTokenHash: string;
    rotatedAt: Date;
  }): Promise<SessionEntity>;

  revokeBySid(sid: string, at: Date): Promise<void>;
  revokeFamily(familyId: string, at: Date): Promise<void>;
}
