/**
 * Runs a unit of work atomically.
 *
 * Services depend on this abstract class, never on `prisma.$transaction`.
 * Repositories called inside `fn` automatically join the running transaction,
 * so a service composes writes across repositories without knowing which
 * database library is underneath:
 *
 * ```ts
 * await this.transactions.run(async () => {
 *   const file = await this.files.create(props);
 *   await this.audit.record('file.created', file.id);
 * });
 * ```
 *
 * Nesting is safe: an inner `run` joins the outer transaction rather than
 * opening a second one.
 */
export abstract class TransactionManager {
  abstract run<T>(fn: () => Promise<T>): Promise<T>;
}
