import { DbHealthPort } from '#src/modules/health/health.ports.js';
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

@Injectable()
export class PrismaDbHealthAdapter extends DbHealthPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async ping(): Promise<void> {
    await this.prisma.$queryRaw`SELECT 1`;
  }
}
