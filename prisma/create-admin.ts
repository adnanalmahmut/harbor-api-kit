import dotenv from 'dotenv';
import path from 'node:path';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { DEFAULT_ROLES } from '../src/modules/rbac/domain/permissions.catalog.js';
import { bootstrapRbac } from './bootstrap-rbac.js';

type AdminInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  locale: string;
  image?: string;
};

function loadScriptEnv(): void {
  const envFile = process.env.APP_ENV === 'test' ? '.env.test' : '.env';
  dotenv.config({ path: path.resolve(process.cwd(), envFile) });
}

function mustEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

function argValue(name: string): string | undefined {
  const prefixed = `--${name}`;
  const index = process.argv.indexOf(prefixed);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function readInput(): AdminInput {
  const email = argValue('email') ?? process.env.ADMIN_EMAIL;
  const password = argValue('password') ?? process.env.ADMIN_PASSWORD;
  const firstName = argValue('first-name') ?? process.env.ADMIN_FIRST_NAME;
  const lastName = argValue('last-name') ?? process.env.ADMIN_LAST_NAME;
  const locale =
    argValue('locale') ??
    process.env.ADMIN_LOCALE ??
    process.env.I18N_DEFAULT_LOCALE ??
    'ar-SY';
  const image = argValue('image') ?? process.env.ADMIN_IMAGE;

  const missing = [
    ['--email or ADMIN_EMAIL', email],
    ['--password or ADMIN_PASSWORD', password],
    ['--first-name or ADMIN_FIRST_NAME', firstName],
    ['--last-name or ADMIN_LAST_NAME', lastName],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Missing required admin input: ${missing.join(', ')}`);
  }

  if (password!.length < 12) {
    throw new Error('Admin password must be at least 12 characters long.');
  }

  return {
    email: email!,
    password: password!,
    firstName: firstName!,
    lastName: lastName!,
    locale,
    image,
  };
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: mustEnv('DATABASE_URL') });
  return new PrismaClient({ adapter });
}

function createCliAuth(prisma: PrismaClient) {
  return betterAuth({
    baseURL: mustEnv('BETTER_AUTH_URL'),
    secret: mustEnv('BETTER_AUTH_SECRET'),
    database: prismaAdapter(prisma as never, { provider: 'postgresql' }),
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

async function createOrUpdateAdmin(
  prisma: PrismaClient,
  input: AdminInput,
): Promise<{ created: boolean; userId: string }> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  const name = `${input.firstName} ${input.lastName}`.trim();

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        firstName: input.firstName,
        lastName: input.lastName,
        locale: input.locale,
        image: input.image,
        emailVerified: true,
      },
    });

    return { created: false, userId: existing.id };
  }

  const auth = createCliAuth(prisma);

  await auth.api.signUpEmail({
    body: {
      email: input.email,
      password: input.password,
      name,
    },
  });

  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (!user) throw new Error('Admin user was not created.');

  await prisma.user.update({
    where: { id: user.id },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      locale: input.locale,
      image: input.image,
      emailVerified: true,
    },
  });

  return { created: true, userId: user.id };
}

async function assignAdminRole(
  prisma: PrismaClient,
  userId: string,
): Promise<void> {
  const adminRole = await prisma.role.findUnique({
    where: { slug: DEFAULT_ROLES.ADMIN.slug },
    select: { id: true },
  });

  if (!adminRole) throw new Error('Admin role was not bootstrapped.');

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId,
      roleId: adminRole.id,
    },
  });
}

async function main(): Promise<void> {
  loadScriptEnv();
  const input = readInput();
  const prisma = createPrismaClient();

  try {
    await bootstrapRbac(prisma);
    const result = await createOrUpdateAdmin(prisma, input);
    await assignAdminRole(prisma, result.userId);

    console.log(
      result.created
        ? `Admin user created and assigned: ${input.email}`
        : `Admin user already exists; profile and role ensured: ${input.email}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Admin CLI failed:', error);
  process.exit(1);
});
