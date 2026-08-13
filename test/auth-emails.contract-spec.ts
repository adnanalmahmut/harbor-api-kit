import { RedisService } from '#src/infrastructure/cache/redis.service.js';
import { PrismaService } from '#src/persistence/prisma/prisma.service.js';
import { AuthEmailPort } from '#src/modules/notify/notify.ports.js';
import { jest } from '@jest/globals';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AuthHelper } from './helpers/auth.helper.js';
import { TestAppFactory } from './helpers/test-app.factory.js';
import { resetDb } from './helpers/test-db.helper.js';
import { clearRedisCache } from './helpers/test-redis.helper.js';

/**
 * The auth module only decides *that* an email should go out and in which
 * language; the notify module owns templates, subjects and delivery. These
 * tests assert on that boundary — the intent handed to `AuthEmailPort` — rather
 * than on the provider.
 */
describe('Authentication emails (contract)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let auth: AuthHelper;
  let sendAuthEmail: jest.SpiedFunction<AuthEmailPort['sendAuthEmail']>;

  beforeAll(async () => {
    const factory = await TestAppFactory.create();
    app = factory.app;
    prisma = factory.prisma;
    redis = factory.redis;
    auth = new AuthHelper(app);
  });

  afterAll(async () => TestAppFactory.teardown(app));

  beforeEach(async () => {
    await resetDb(prisma);
    await clearRedisCache(redis);
    sendAuthEmail = jest
      .spyOn(app.get(AuthEmailPort), 'sendAuthEmail')
      .mockResolvedValue(undefined);
  });

  afterEach(() => sendAuthEmail.mockRestore());

  it('requests a verification email on sign-up with the provider link', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/sign-up/email')
      .send({
        email: 'verify-me@test.com',
        password: 'Password123!',
        name: 'Verify Me',
      })
      .expect(200);

    expect(sendAuthEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'verify-email',
        to: 'verify-me@test.com',
        name: 'Verify Me',
      }),
    );
    // The link is Better Auth's own, not rebuilt by the application.
    const [{ url }] = sendAuthEmail.mock.calls[0];
    expect(url).toContain('/verify-email?token=');
  });

  it('requests a reset-password email in the requested language', async () => {
    await auth.registerAndLogin({
      email: 'reset-me@test.com',
      password: 'Password123!',
      name: 'Reset Me',
    });
    sendAuthEmail.mockClear();

    await request(app.getHttpServer())
      .post('/api/v1/auth/request-password-reset')
      .set('Accept-Language', 'ar-SY')
      .send({ email: 'reset-me@test.com', redirectTo: '/reset' })
      .expect(200);

    expect(sendAuthEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'reset-password',
        to: 'reset-me@test.com',
        locale: 'ar-SY',
      }),
    );
  });

  it('sends the change-email confirmation to the new address', async () => {
    const { userId } = await auth.registerAndLogin({
      email: 'current@test.com',
      password: 'Password123!',
      name: 'Current Address',
    });
    // Better Auth only asks for confirmation when the current address is
    // verified. Sign in again afterwards: the session carries a snapshot of the
    // user, so a session opened before this write still reports it unverified.
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
    const cookies = await auth.signIn('current@test.com', 'Password123!');
    sendAuthEmail.mockClear();

    await request(app.getHttpServer())
      .post('/api/v1/auth/change-email')
      .set('Cookie', cookies)
      .send({ newEmail: 'claimed@test.com' })
      .expect(200);

    expect(sendAuthEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'change-email',
        to: 'claimed@test.com',
      }),
    );

    // The address only changes once the confirmation link is followed.
    const stored = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true },
    });
    expect(stored.email).toBe('current@test.com');
  });
});
