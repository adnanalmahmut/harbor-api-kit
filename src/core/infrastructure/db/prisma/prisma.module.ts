import { AppConfigModule } from '#src/core/infrastructure/config/app-config.module.js';
import { PrismaService } from '#src/core/infrastructure/db/prisma/prisma.service.js';
import { Module } from '@nestjs/common';

@Module({
  imports: [AppConfigModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
