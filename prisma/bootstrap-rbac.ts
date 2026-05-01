import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from '../src/generated/prisma/client.js';
import {
  DEFAULT_ROLES,
  PERMISSION_CATALOG,
  RBAC_ACTIONS,
  RBAC_SUBJECTS,
} from '../src/modules/rbac/domain/permissions.catalog.js';

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

const ALLOWED_APP_ENVS = new Set([
  'development',
  'test',
  'staging',
  'production',
]);

function loadScriptEnv(): void {
  const envFile = process.env.APP_ENV === 'test' ? '.env.test' : '.env';
  dotenv.config({ path: path.resolve(process.cwd(), envFile) });
}

function mustEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

function assertAllowedAppEnv(): string {
  const appEnv = process.env.APP_ENV ?? 'development';
  if (!ALLOWED_APP_ENVS.has(appEnv)) {
    throw new Error(
      `RBAC bootstrap can run only with APP_ENV in ${Array.from(
        ALLOWED_APP_ENVS,
      ).join(', ')}. Current APP_ENV: ${appEnv}`,
    );
  }
  return appEnv;
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: mustEnv('DATABASE_URL') });
  return new PrismaClient({ adapter });
}

async function bootstrapSystemRoles(prisma: PrismaExecutor) {
  console.log('Bootstrapping RBAC roles...');

  const roles = Object.values(DEFAULT_ROLES);

  for (const role of roles) {
    await prisma.role.upsert({
      where: { slug: role.slug },
      update: {
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
      },
      create: {
        name: role.name,
        slug: role.slug,
        description: role.description,
        isSystem: role.isSystem,
      },
    });
  }
}

async function getNextPermissionIndex(prisma: PrismaExecutor): Promise<number> {
  const max = await prisma.permission.aggregate({
    _max: { index: true },
  });

  return (max._max.index ?? 0) + 1;
}

async function bootstrapPermissions(prisma: PrismaExecutor) {
  console.log('Bootstrapping RBAC permissions...');

  let nextIndex = await getNextPermissionIndex(prisma);

  for (const [subject, actions] of Object.entries(PERMISSION_CATALOG)) {
    for (const action of actions) {
      const existing = await prisma.permission.findUnique({
        where: {
          action_subject: {
            action,
            subject,
          },
        },
      });

      if (existing) {
        await prisma.permission.update({
          where: { id: existing.id },
          data: {
            description: `${action} ${subject}`,
          },
        });
        continue;
      }

      await prisma.permission.create({
        data: {
          action,
          subject,
          index: nextIndex,
          description: `${action} ${subject}`,
        },
      });

      nextIndex += 1;
    }
  }
}

async function assignPermissionToRoleByTuple(
  prisma: PrismaExecutor,
  params: {
    roleId: string;
    action: string;
    subject: string;
  },
) {
  const permission = await prisma.permission.findUnique({
    where: {
      action_subject: {
        action: params.action,
        subject: params.subject,
      },
    },
  });

  if (!permission) return;

  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: params.roleId,
        permissionId: permission.id,
      },
    },
    update: {},
    create: {
      roleId: params.roleId,
      permissionId: permission.id,
    },
  });
}

async function bootstrapRolePermissions(prisma: PrismaExecutor) {
  console.log('Bootstrapping RBAC role permissions...');

  const adminRole = await prisma.role.findUnique({
    where: { slug: DEFAULT_ROLES.ADMIN.slug },
  });
  const userRole = await prisma.role.findUnique({
    where: { slug: DEFAULT_ROLES.USER.slug },
  });

  if (!adminRole) throw new Error('Admin role was not bootstrapped.');
  if (!userRole) throw new Error('User role was not bootstrapped.');

  const permissions = await prisma.permission.findMany({
    select: { id: true },
  });

  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    });
  }

  const userPermissions = [
    { action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.USER },
    { action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.FILES },
    { action: RBAC_ACTIONS.CREATE, subject: RBAC_SUBJECTS.FILES },
  ];

  for (const permission of userPermissions) {
    await assignPermissionToRoleByTuple(prisma, {
      roleId: userRole.id,
      action: permission.action,
      subject: permission.subject,
    });
  }
}

export async function bootstrapRbac(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await bootstrapSystemRoles(tx);
    await bootstrapPermissions(tx);
    await bootstrapRolePermissions(tx);
  });
}

export async function runBootstrapRbacCli(): Promise<void> {
  loadScriptEnv();
  const appEnv = assertAllowedAppEnv();
  const prisma = createPrismaClient();

  try {
    console.log(`Starting RBAC bootstrap for APP_ENV=${appEnv}...`);
    await bootstrapRbac(prisma);
    console.log('RBAC bootstrap completed.');
  } finally {
    await prisma.$disconnect();
  }
}

function isMainModule(): boolean {
  return (
    process.argv[1] !== undefined &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  );
}

if (isMainModule()) {
  runBootstrapRbacCli().catch((error) => {
    console.error('RBAC bootstrap failed:', error);
    process.exit(1);
  });
}
