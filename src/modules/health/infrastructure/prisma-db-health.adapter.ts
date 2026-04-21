import { PrismaService } from '#src/core/infrastructure/db/prisma/prisma.service.js';
import { Injectable } from '@nestjs/common';
import type { DbHealthPort } from '../domain/index.js';

@Injectable()
export class PrismaDbHealthAdapter implements DbHealthPort {
  constructor(private readonly prisma: PrismaService) {}

  async ping(): Promise<void> {
    await this.prisma.$queryRaw`SELECT 1`;
  }
}
