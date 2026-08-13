import { AsyncLocalStorage } from 'node:async_hooks';
import type { Prisma } from '#src/generated/prisma/client.js';
import { TransactionManager } from '#src/persistence/transaction.manager.js';
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

/**
 * A Prisma client that may or may not be inside a transaction. Repositories
 * read `client` instead of injecting `PrismaService` directly, which is what
 * makes them transaction-aware without any explicit plumbing.
 */
export type PrismaClientLike = PrismaService | Prisma.TransactionClient;

@Injectable()
export class PrismaTransactionManager extends TransactionManager {
  private readonly storage = new AsyncLocalStorage<Prisma.TransactionClient>();

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  /** The transactional client when inside `run`, the plain client otherwise. */
  get client(): PrismaClientLike {
    return this.storage.getStore() ?? this.prisma;
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    // Nesting joins the outer transaction: two independent `$transaction`
    // calls would deadlock against each other on the same connection pool.
    if (this.storage.getStore()) return fn();

    return this.prisma.$transaction((tx) => this.storage.run(tx, fn));
  }
}
