import { PrismaClient } from '#src/generated/prisma/client.js';

export async function resetDb(prisma: PrismaClient) {
  const tablenames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

  const tablesToTruncate = tablenames
    .map(({ tablename }: { tablename: string }) => tablename)
    .filter((name: string) => name !== '_prisma_migrations')
    .map((name: string) => `"public"."${name}"`)
    .join(', ');

  if (tablesToTruncate.length > 0) {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE ${tablesToTruncate} RESTART IDENTITY CASCADE;`,
    );
  }
}
