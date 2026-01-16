import { AppConfigModule } from '#src/infrastructure/config/app-config.module.js';
import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

@Module({
  imports: [AppConfigModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
