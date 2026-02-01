import { PrismaClient } from '#src/generated/prisma/client.js';

export async function resetDb(prisma: PrismaClient) {
  const tablenames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

  const staticTables = [
    'Role',
    'Permission',
    'RolePermission',
    'role',
    'permission',
    'role_permission',
  ];

  const tablesToTruncate = tablenames
    .map(({ tablename }: { tablename: string }) => tablename)
    .filter((name: string) => name !== '_prisma_migrations')
    .filter((name: string) => !staticTables.includes(name))
    .map((name: string) => `"public"."${name}"`)
    .join(', ');

  if (tablesToTruncate.length > 0) {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE ${tablesToTruncate} CASCADE;`,
    );
  }
}
