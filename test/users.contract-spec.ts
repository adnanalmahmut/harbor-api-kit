import { PrismaService, RedisService } from '#src/core/index.js';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AuthHelper } from './helpers/auth.helper.js';
import { TestAppFactory } from './helpers/test-app.factory.js';
import { resetDb } from './helpers/test-db.helper.js';
import { clearRedisCache } from './helpers/test-redis.helper.js';

describe('Users authorization API (contract)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let auth: AuthHelper;
  let adminCookies: string[];
  let csrfCookie: string;
  let csrfToken: string;

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
    adminCookies = (await auth.setupAdmin()).cookies;
    const response = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Cookie', adminCookies)
      .expect(200);
    const csrf = (response.get('Set-Cookie') || [])
      .map((cookie) => cookie.match(/__Host-csrf=([^;]+)/))
      .find(Boolean);
    if (!csrf) throw new Error('CSRF token was not issued.');
    csrfToken = csrf[1];
    csrfCookie = csrf[0];
  });

  function mutationHeaders(): Record<string, string> {
    return {
      Cookie: [...adminCookies, csrfCookie].join('; '),
      'X-CSRF-Token': csrfToken,
    };
  }

  it('stores permission keys directly as user overrides', async () => {
    const target = await auth.registerAndLogin({
      email: 'override@test.com',
      password: 'Password123!',
      firstName: 'Override',
      lastName: 'User',
    });

    await request(app.getHttpServer())
      .post(`/api/v1/users/${target.userId}/permissions`)
      .set(mutationHeaders())
      .send({ permissionKey: 'files:delete', effect: 'ALLOW' })
      .expect(201);

    const override = await prisma.userPermission.findUniqueOrThrow({
      where: {
        userId_permissionKey: {
          userId: target.userId,
          permissionKey: 'files:delete',
        },
      },
    });
    expect(override.effect).toBe('ALLOW');
  });

  it('rejects permission keys outside the static catalog', async () => {
    const target = await auth.registerAndLogin({
      email: 'invalid-override@test.com',
      password: 'Password123!',
      firstName: 'Invalid',
      lastName: 'Override',
    });

    await request(app.getHttpServer())
      .post(`/api/v1/users/${target.userId}/permissions`)
      .set(mutationHeaders())
      .send({ permissionKey: 'unknown:permission', effect: 'ALLOW' })
      .expect(400);
  });

  it('returns roles and effective permissions from code plus overrides', async () => {
    const target = await auth.registerAndLogin({
      email: 'effective@test.com',
      password: 'Password123!',
      firstName: 'Effective',
      lastName: 'User',
    });
    await prisma.userPermission.create({
      data: {
        userId: target.userId,
        permissionKey: 'files:create',
        effect: 'DENY',
      },
    });

    const response = await request(app.getHttpServer())
      .get(`/api/v1/users/${target.userId}/effective-permissions`)
      .set('Cookie', adminCookies)
      .expect(200);

    expect(response.body.data.roles).toEqual(['user']);
    expect(response.body.data.permissions).toContain('files:read');
    expect(response.body.data.permissions).not.toContain('files:create');
  });

  it('does not expose the removed role-management routes', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/users/example/roles')
      .set('Cookie', adminCookies)
      .expect(404);
  });
});
