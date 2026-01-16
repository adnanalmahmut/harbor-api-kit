import { AppException } from '#src/core/exceptions/app-exception.js';
import { AppErrorCode } from '#src/core/exceptions/error-definitions.js';
import type { Prisma } from '#src/generated/prisma/client.js';
import { PrismaService } from '#src/infrastructure/db/prisma/prisma.service.js';
import type {
  CreateSessionData,
  SessionRepositoryPort,
} from '#src/modules/auth/domain/ports/session.repository.port.js';
import { Injectable } from '@nestjs/common';
import { mapPrismaSessionToEntity } from '../mappers/sessions.mapper.js';

const sessionSelect = {
  sid: true,
  userId: true,
  refreshTokenHash: true,
  familyId: true,
  parentId: true,
  expiresAt: true,
  rotatedAt: true,
  revokedAt: true,
  lastUsedAt: true,
  ipHash: true,
  uaHash: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SessionSelect;

const sessionParentSelect = {
  userId: true,
  familyId: true,
} satisfies Prisma.SessionSelect;

@Injectable()
export class PrismaSessionsRepository implements SessionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateSessionData) {
    const row = await this.prisma.session.create({
      data: {
        sid: data.sid,
        userId: data.userId,
        refreshTokenHash: data.refreshTokenHash,
        familyId: data.familyId,
        parentId: data.parentId ?? null,
        expiresAt: data.expiresAt,
        ipHash: data.ipHash ?? null,
        uaHash: data.uaHash ?? null,
      },
      select: sessionSelect,
    });

    return mapPrismaSessionToEntity(row);
  }

  async findBySid(sid: string) {
    const row = await this.prisma.session.findUnique({
      where: { sid },
      select: sessionSelect,
    });

    return row ? mapPrismaSessionToEntity(row) : null;
  }

  async findByRefreshTokenHash(hash: string) {
    const row = await this.prisma.session.findUnique({
      where: { refreshTokenHash: hash },
      select: sessionSelect,
    });

    return row ? mapPrismaSessionToEntity(row) : null;
  }

  async updateLastUsedAt(sid: string, at: Date) {
    await this.prisma.session.update({
      where: { sid },
      data: { lastUsedAt: at },
      select: { sid: true },
    });
  }

  async rotate(params: {
    sid: string;
    newSid: string;
    newRefreshTokenHash: string;
    rotatedAt: Date;
  }) {
    const { sid, newSid, newRefreshTokenHash, rotatedAt } = params;

    await this.prisma.session.update({
      where: { sid },
      data: { rotatedAt, revokedAt: rotatedAt },
      select: { sid: true },
    });

    const old = await this.prisma.session.findUnique({
      where: { sid },
      select: sessionParentSelect,
    });

    if (!old) {
      throw new AppException({
        code: AppErrorCode.NOT_FOUND,
        messageKey: 'errors.auth.session.not_found',
        details: { sid },
      });
    }

    const row = await this.prisma.session.create({
      data: {
        sid: newSid,
        userId: old.userId,
        familyId: old.familyId,
        parentId: sid,
        refreshTokenHash: newRefreshTokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // placeholder
      },
      select: sessionSelect,
    });

    return mapPrismaSessionToEntity(row);
  }

  async revokeBySid(sid: string, at: Date) {
    await this.prisma.session.update({
      where: { sid },
      data: { revokedAt: at },
      select: { sid: true },
    });
  }

  async revokeFamily(familyId: string, at: Date) {
    await this.prisma.session.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: at },
    });
  }
}
