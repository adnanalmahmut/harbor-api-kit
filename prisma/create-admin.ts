import dotenv from 'dotenv';
import path from 'node:path';
import { z } from 'zod';

const adminInputSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(12).max(128),
  name: z.string().trim().min(1).max(100),
  locale: z.enum(['ar-SY', 'en-US']),
  image: z.url().optional(),
});

type AdminInput = z.infer<typeof adminInputSchema>;

function loadScriptEnv(): void {
  if (process.env.APP_ENV === 'production') return;

  const envFile = process.env.APP_ENV === 'test' ? '.env.test' : '.env';
  dotenv.config({ path: path.resolve(process.cwd(), envFile), quiet: true });
}

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  const value = index === -1 ? undefined : process.argv[index + 1];
  return value && !value.startsWith('--') ? value : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function printHelp(): void {
  process.stdout.write(`Create the first administrator account.

Usage:
  npm run admin:create -- --email admin@example.com

Options:
  --email <email>          Required unless ADMIN_EMAIL is set
  --name <name>            Defaults to Admin User
  --locale <locale>        ar-SY or en-US; defaults to I18N_DEFAULT_LOCALE
  --image <url>            Optional profile image URL
  --allow-production       Required when APP_ENV=production
  --help                   Show this help

Password:
  Entered and confirmed through hidden interactive prompts, or read from
  ADMIN_PASSWORD for non-interactive secret injection. Do not pass it as a
  CLI argument.
`);
}

async function readHiddenPassword(prompt: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      'ADMIN_PASSWORD is required when the CLI is not running interactively.',
    );
  }

  process.stdout.write(prompt);
  process.stdin.setEncoding('utf8');
  process.stdin.setRawMode(true);
  process.stdin.resume();

  return new Promise<string>((resolve, reject) => {
    let value = '';

    const cleanup = () => {
      process.stdin.off('data', onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    };

    const onData = (chunk: string | Buffer) => {
      for (const character of String(chunk)) {
        if (character === '\u0003') {
          cleanup();
          process.stdout.write('\n');
          reject(new Error('Admin creation cancelled.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          cleanup();
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (character === '\u007f' || character === '\b') {
          value = value.slice(0, -1);
          continue;
        }
        if (character >= ' ') value += character;
      }
    };

    process.stdin.on('data', onData);
  });
}

async function readInput(): Promise<AdminInput> {
  const passwordFromEnvironment = process.env.ADMIN_PASSWORD;
  delete process.env.ADMIN_PASSWORD;
  const password =
    passwordFromEnvironment ?? (await readHiddenPassword('Admin password: '));

  if (!passwordFromEnvironment) {
    const confirmation = await readHiddenPassword('Confirm password: ');
    if (password !== confirmation) {
      throw new Error('Admin passwords do not match.');
    }
  }

  return adminInputSchema.parse({
    email: argValue('email') ?? process.env.ADMIN_EMAIL,
    password,
    name: argValue('name') ?? process.env.ADMIN_NAME ?? 'Admin User',
    locale:
      argValue('locale') ??
      process.env.ADMIN_LOCALE ??
      process.env.I18N_DEFAULT_LOCALE ??
      'ar-SY',
    image: argValue('image') ?? process.env.ADMIN_IMAGE,
  });
}

function assertEnvironmentSafety(): void {
  const environment = process.env.APP_ENV ?? 'development';
  if (environment === 'test') {
    throw new Error('The admin bootstrap CLI cannot run with APP_ENV=test.');
  }
  if (environment === 'production' && !hasFlag('allow-production')) {
    throw new Error(
      'Refusing to modify production without --allow-production.',
    );
  }
}

async function main(): Promise<void> {
  loadScriptEnv();
  if (hasFlag('help')) {
    printHelp();
    return;
  }

  assertEnvironmentSafety();
  const input = await readInput();
  const { auth, prisma } = await import('../better-auth.js');

  try {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existing) {
      throw new Error(
        'A user with this email already exists. Promote it through an authenticated admin flow instead.',
      );
    }

    const created = await auth.api.signUpEmail({
      body: {
        email: input.email,
        password: input.password,
        name: input.name,
        locale: input.locale,
        ...(input.image ? { image: input.image } : {}),
      },
    });

    try {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: created.user.id },
          data: {
            emailVerified: true,
            role: 'admin',
          },
        }),
        prisma.session.deleteMany({ where: { userId: created.user.id } }),
      ]);
    } catch (error) {
      await prisma.user
        .delete({ where: { id: created.user.id } })
        .catch(() => undefined);
      throw error;
    }

    process.stdout.write(`Admin user created: ${input.email}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  process.stderr.write(`Admin CLI failed: ${message}\n`);
  process.exitCode = 1;
});
