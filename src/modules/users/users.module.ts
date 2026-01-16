import { PrismaModule } from '#src/infrastructure/db/prisma/prisma.module.js';
import { Module } from '@nestjs/common';
import { PrismaUsersRepository } from './infrastructure/persistence/prisma-users.repository.js';
import { USERS_TOKENS } from './users.tokens.js';

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: USERS_TOKENS.USER_REPOSITORY,
      useClass: PrismaUsersRepository,
    },
  ],
  exports: [USERS_TOKENS.USER_REPOSITORY],
})
export class UsersModule {}
