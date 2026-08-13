import { RedisService } from '#src/infrastructure/cache/redis.service.js';
import { PrismaService } from '#src/persistence/prisma/prisma.service.js';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AuthHelper } from './helpers/auth.helper.js';
import { TestAppFactory } from './helpers/test-app.factory.js';
import { resetDb } from './helpers/test-db.helper.js';
import { clearRedisCache } from './helpers/test-redis.helper.js';

describe('User permissions API (contract)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let auth: AuthHelper;
  let adminId: string;
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
    const admin = await auth.setupAdmin();
    adminId = admin.userId;
    adminCookies = admin.cookies;
    const response = await request(app.getHttpServer())
      .get(`/api/v1/users/${adminId}/permissions`)
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
      name: 'Override User',
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
      name: 'Invalid Override',
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
      name: 'Effective User',
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

  it('returns 404 when removing an override the user does not have', async () => {
    const target = await auth.registerAndLogin({
      email: 'missing-override@test.com',
      password: 'Password123!',
      name: 'Missing Override',
    });

    await request(app.getHttpServer())
      .delete(`/api/v1/users/${target.userId}/permissions/files:delete`)
      .set(mutationHeaders())
      .expect(404);
  });

  it('does not expose the removed role-management routes', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/users/example/roles')
      .set('Cookie', adminCookies)
      .expect(404);
  });

  it('does not expose user CRUD outside Better Auth admin routes', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Cookie', adminCookies)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/api/v1/users/${adminId}`)
      .set('Cookie', adminCookies)
      .expect(404);
  });
});
