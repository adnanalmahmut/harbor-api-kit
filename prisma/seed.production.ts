/* prisma/seed.ts */
// STRICT ENVIRONMENT GATING: Seed only runs in test environment
if (
  process.env.APP_ENV !== 'production' ||
  process.env.ALLOW_PROD_SEED !== 'true'
) {
  console.error(
    '⛔ Seed can only run when APP_ENV=production AND ALLOW_PROD_SEED=true',
  );
  console.error('   Current APP_ENV:', process.env.APP_ENV || 'undefined');
  console.error(
    '   Current ALLOW_PROD_SEED:',
    process.env.ALLOW_PROD_SEED || 'undefined',
  );
  console.error(
    '   Run with: APP_ENV=production ALLOW_PROD_SEED=true npx prisma db seed',
  );
  process.exit(1);
}

import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

import {
  DEFAULT_ROLES,
  PERMISSION_CATALOG,
  RBAC_ACTIONS,
  RBAC_SUBJECTS,
} from './seed-data/permissions.catalog.js';

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

// Better error visibility
process.on('unhandledRejection', (reason) => {
  console.error('❌  UnhandledRejection:', reason);
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  console.error('❌  UncaughtException:', err);
  process.exit(1);
});

async function seedSystemRoles(prisma: PrismaClient) {
  console.log('Seeding Roles...');
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
        slug: role.slug,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
      },
    });
  }
}

type PermDef = { subject: string; action: string };

function collectCatalogPermissions(): PermDef[] {
  const items: PermDef[] = [];
  for (const [subject, actions] of Object.entries(PERMISSION_CATALOG)) {
    for (const action of actions) items.push({ subject, action });
  }
  items.sort((a, b) => {
    const s = a.subject.localeCompare(b.subject);
    return s !== 0 ? s : a.action.localeCompare(b.action);
  });
  return items;
}

async function seedPermissions(prisma: PrismaClient) {
  console.log('Seeding Permissions...');

  const lastPerm = await prisma.permission.findFirst({
    orderBy: { index: 'desc' },
    select: { index: true },
  });
  let nextIndex = (lastPerm?.index ?? 0) + 1;

  const perms = collectCatalogPermissions();

  for (const { subject, action } of perms) {
    const existing = await prisma.permission.findUnique({
      where: { action_subject: { action, subject } },
      select: { id: true },
    });

    if (!existing) {
      await prisma.permission.create({
        data: {
          subject,
          action,
          index: nextIndex++,
          description: `Allow ${action} on ${subject}`,
        },
      });
    } else {
      await prisma.permission.update({
        where: { id: existing.id },
        data: { description: `Allow ${action} on ${subject}` },
      });
    }
  }
}

async function assignPermissionsToRoles(prisma: PrismaClient) {
  console.log('Assigning Permissions to Roles...');

  const adminRole = await prisma.role.findUnique({
    where: { slug: DEFAULT_ROLES.ADMIN.slug },
    select: { id: true },
  });
  const userRole = await prisma.role.findUnique({
    where: { slug: DEFAULT_ROLES.USER.slug },
    select: { id: true },
  });

  if (adminRole) {
    const allPermissions = await prisma.permission.findMany({
      select: { id: true },
    });

    for (const perm of allPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: adminRole.id,
          permissionId: perm.id,
        },
      });
    }
  }

  if (userRole) {
    // Define base permissions for the User role
    const userPermissions = [
      { action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.USER },
      { action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.FILES },
      { action: RBAC_ACTIONS.CREATE, subject: RBAC_SUBJECTS.FILES },
    ];

    for (const permDef of userPermissions) {
      const perm = await prisma.permission.findUnique({
        where: {
          action_subject: {
            action: permDef.action,
            subject: permDef.subject,
          },
        },
        select: { id: true },
      });

      if (perm) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: userRole.id,
              permissionId: perm.id,
            },
          },
          update: {},
          create: {
            roleId: userRole.id,
            permissionId: perm.id,
          },
        });
      }
    }
  }
}

function createSeedAuth(prisma: PrismaClient) {
  const betterAuthUrl = mustEnv('BETTER_AUTH_URL');
  const betterAuthSecret = mustEnv('BETTER_AUTH_SECRET');

  // Minimal config just to use auth.api.signUpEmail (hashing + account creation)
  return betterAuth({
    baseURL: betterAuthUrl,
    secret: betterAuthSecret,
    database: prismaAdapter(prisma as any, { provider: 'postgresql' }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    user: { modelName: 'User' },
    session: { modelName: 'Session', storeSessionInDatabase: true },
    account: { modelName: 'Account' },
    verification: { modelName: 'Verification' },
  });
}

async function hardDeleteUserByEmail(prisma: PrismaClient, email: string) {
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!existing) return;

  // Hard delete (cascades to account/session via schema onDelete: Cascade)
  await prisma.user.delete({ where: { id: existing.id } });
}

async function seedTestUsersViaBetterAuth(prisma: PrismaClient) {
  console.log('Seeding Test Users (via BetterAuth)...');

  const auth = createSeedAuth(prisma);

  // Defaults for non-admin users
  const defaultPassword = process.env.SEED_TEST_PASSWORD ?? 'password123';
  const defaultLocale = process.env.I18N_DEFAULT_LOCALE ?? 'en-US';
  const defaultImageBase =
    process.env.SEED_DEFAULT_USER_IMAGE_URL_BASE ??
    'https://api.dicebear.com/9.x/initials/svg?seed=';

  // Admin from env (required)
  const adminEmail = mustEnv('SEED_ADMIN_EMAIL');
  const adminPassword = mustEnv('SEED_ADMIN_PASSWORD');
  const adminFirstName = mustEnv('SEED_ADMIN_FIRST_NAME');
  const adminLastName = mustEnv('SEED_ADMIN_LAST_NAME');
  const adminLocale = process.env.SEED_ADMIN_LOCALE ?? defaultLocale;

  const roles = await prisma.role.findMany({
    select: { id: true, slug: true, name: true },
    orderBy: { slug: 'asc' },
  });

  // Helper to create/recreate a user via BetterAuth then fill extra fields in Prisma
  const createUserViaBetterAuth = async (params: {
    email: string;
    password: string;
    name: string;
    locale: string;
    firstName: string;
    lastName: string;
    image?: string | null;
  }) => {
    // Ensure deterministic behavior: recreate only SEED users (by email)
    await hardDeleteUserByEmail(prisma, params.email);

    await auth.api.signUpEmail({
      body: {
        email: params.email,
        password: params.password,
        name: params.name,
      },
    });

    const user = await prisma.user.findUnique({
      where: { email: params.email },
      select: { id: true, email: true },
    });
    if (!user)
      throw new Error(`User not found after signUpEmail: ${params.email}`);

    const image =
      params.image ?? defaultImageBase + encodeURIComponent(params.name);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        locale: params.locale,
        name: params.name,
        firstName: params.firstName,
        lastName: params.lastName,
        image,
      },
    });

    return user;
  };

  // 1) Create Admin user using env vars (and assign ADMIN role)
  const adminRole = roles.find((r) => r.slug === DEFAULT_ROLES.ADMIN.slug);
  if (!adminRole) throw new Error('ADMIN role not found. Seed roles first.');

  const adminName = `${adminFirstName} ${adminLastName}`.trim();

  const adminUser = await createUserViaBetterAuth({
    email: adminEmail,
    password: adminPassword,
    name: adminName,
    locale: adminLocale,
    firstName: adminFirstName,
    lastName: adminLastName,
    image: process.env.SEED_ADMIN_IMAGE ?? null,
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: { userId: adminUser.id, roleId: adminRole.id },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
      // assignedBy intentionally omitted (or keep null) unless your schema requires FK userId
    },
  });

  // 2) Create one test user per remaining role (role-based email)
  for (const role of roles) {
    if (role.slug === DEFAULT_ROLES.ADMIN.slug) continue;

    const email = `${role.slug}@example.com`;
    const name = `Test ${role.name}`;

    // Simple deterministic split
    const [firstName, ...rest] = name.split(' ');
    const lastName = rest.join(' ') || role.name;

    const user = await createUserViaBetterAuth({
      email,
      password: defaultPassword,
      name,
      locale: defaultLocale,
      firstName: firstName || 'Test',
      lastName,
    });

    await prisma.userRole.upsert({
      where: {
        userId_roleId: { userId: user.id, roleId: role.id },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: role.id,
      },
    });
  }
}

async function main() {
  // Additional safety check (already checked at top of file)
  if (
    process.env.APP_ENV !== 'production' ||
    process.env.ALLOW_PROD_SEED !== 'true'
  ) {
    console.error('⛔  Seed can only run when APP_ENV=production');
    process.exit(1);
  }

  const databaseUrl = mustEnv('DATABASE_URL');

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.$transaction(async (tx) => {
      await seedSystemRoles(tx as unknown as PrismaClient);
      await seedPermissions(tx as unknown as PrismaClient);
      await assignPermissionsToRoles(tx as unknown as PrismaClient);
      await seedTestUsersViaBetterAuth(tx as unknown as PrismaClient);
    });

    console.log('✅  Seeding completed.');
  } catch (e) {
    console.error('❌  Seeding failed:');
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
