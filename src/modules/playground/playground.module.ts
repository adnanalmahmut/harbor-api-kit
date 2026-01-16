import { PrismaModule } from '#src/infrastructure/db/prisma/prisma.module.js';
import { Module } from '@nestjs/common';
import { PlaygroundController } from './playground.controller.js';

@Module({
  imports: [PrismaModule],
  controllers: [PlaygroundController],
})
export class PlaygroundModule {}
