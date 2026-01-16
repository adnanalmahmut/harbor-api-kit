import { createPrismaClient } from '../src/infrastructure/db/prisma/prisma-client.factory.js';

const prisma = createPrismaClient(process.env.DATABASE_URL!);

async function main() {
  const permissions = [
    { action: 'users', subject: 'read', index: 0, description: 'View users' },
    {
      action: 'users',
      subject: 'write',
      index: 1,
      description: 'Create/Edit users',
    },
    {
      action: 'rbac',
      subject: 'manage',
      index: 2,
      description: 'Manage roles/permissions',
    },
  ];

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { action_subject: { action: p.action, subject: p.subject } },
      update: { index: p.index, description: p.description },
      create: p,
    });
  }

  const roles = [
    {
      name: 'Admin',
      slug: 'admin',
      description: 'System Administrator',
      isSystem: true,
    },
    {
      name: 'Staff',
      slug: 'staff',
      description: 'Internal Staff',
      isSystem: true,
    },
    {
      name: 'User',
      slug: 'user',
      description: 'Standard User',
      isSystem: true,
    },
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { slug: r.slug },
      update: {
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
      },
      create: r,
    });
  }

  const admin = await prisma.role.findUnique({
    where: { slug: 'admin' },
    select: { id: true },
  });

  const allPerms = await prisma.permission.findMany({ select: { id: true } });

  if (admin) {
    for (const p of allPerms) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: admin.id, permissionId: p.id },
        },
        update: {},
        create: { roleId: admin.id, permissionId: p.id },
      });
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
