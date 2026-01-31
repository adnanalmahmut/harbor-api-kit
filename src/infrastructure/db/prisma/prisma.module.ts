import { AppConfigModule } from '#src/infrastructure/config/app-config.module.js';
import { PrismaService } from '#src/infrastructure/db/prisma/prisma.service.js';
import { Module } from '@nestjs/common';

@Module({
  imports: [AppConfigModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
