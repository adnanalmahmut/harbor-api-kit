import { PrismaModule } from '#src/infrastructure/db/prisma/prisma.module.js';
import { AUTH_TOKENS } from '#src/modules/auth/auth.tokens.js';
import { Module } from '@nestjs/common';
import { PrismaSessionsRepository } from './infrastructure/persistence/prisma-sessions.repository.js';

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: AUTH_TOKENS.SESSION_REPOSITORY,
      useClass: PrismaSessionsRepository,
    },
  ],
  exports: [AUTH_TOKENS.SESSION_REPOSITORY],
})
export class AuthModule {}
