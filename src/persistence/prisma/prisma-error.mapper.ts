/**
 * Prisma error codes never leave `src/persistence/**`. Adapters translate them
 * here so that swapping the database library cannot change any HTTP status.
 *
 * @see https://www.prisma.io/docs/orm/reference/error-reference
 */
export const PrismaErrorCode = {
  /** An operation failed because it depends on one or more records that were required but not found. */
  RECORD_NOT_FOUND: 'P2025',
  /** Unique constraint failed. */
  UNIQUE_VIOLATION: 'P2002',
  /** Foreign key constraint failed. */
  FOREIGN_KEY_VIOLATION: 'P2003',
} as const;

function prismaErrorCode(error: unknown): string | undefined {
  return (error as { code?: string } | null)?.code;
}

export function isPrismaError(error: unknown, code: string): boolean {
  return prismaErrorCode(error) === code;
}

export const isRecordNotFound = (error: unknown) =>
  isPrismaError(error, PrismaErrorCode.RECORD_NOT_FOUND);
