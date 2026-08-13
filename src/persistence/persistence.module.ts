import { AuthorizationRepository } from '#src/modules/authorization/authorization.repository.js';
import { FileRepository } from '#src/modules/files/files.repository.js';
import { DbHealthPort } from '#src/modules/health/health.ports.js';
import { Global, Module } from '@nestjs/common';
import { PrismaAuthorizationRepository } from './prisma/authorization.prisma.repository.js';
import { PrismaDbHealthAdapter } from './prisma/db-health.prisma.adapter.js';
import { PrismaFileRepository } from './prisma/file.prisma.repository.js';
import { PrismaTransactionManager } from './prisma/prisma-transaction.manager.js';
import { PrismaService } from './prisma/prisma.service.js';
import { TransactionManager } from './transaction.manager.js';

/**
 * The composition root for data access, and the ONLY place the application
 * names a database library.
 *
 * Swapping Prisma for something else is: add a sibling folder next to
 * `prisma/`, implement the same repository classes against it, and change the
 * `useClass` entries below. No feature module changes, because no feature
 * module imports from here — they depend on the abstract repository declared
 * alongside their own service.
 */
@Global()
@Module({
  providers: [
    PrismaService,
    PrismaTransactionManager,
    { provide: TransactionManager, useExisting: PrismaTransactionManager },

    {
      provide: AuthorizationRepository,
      useClass: PrismaAuthorizationRepository,
    },
    { provide: DbHealthPort, useClass: PrismaDbHealthAdapter },
    { provide: FileRepository, useClass: PrismaFileRepository },
  ],
  exports: [
    TransactionManager,
    AuthorizationRepository,
    DbHealthPort,
    FileRepository,
    // Exported for exactly one consumer: Better Auth's `prismaAdapter`, which
    // needs the client itself. That exception is documented in
    // docs/persistence.md and enforced by the ESLint allowlist — only
    // `auth.module.ts` and `better-auth/better-auth.ts` may import it.
    PrismaService,
  ],
})
export class PersistenceModule {}
