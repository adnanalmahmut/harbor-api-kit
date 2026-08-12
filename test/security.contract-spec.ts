import { PrismaService, RedisService } from '#src/core/index.js';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AuthHelper } from './helpers/auth.helper.js';
import { TestAppFactory } from './helpers/test-app.factory.js';
import { resetDb } from './helpers/test-db.helper.js';
import { clearRedisCache } from './helpers/test-redis.helper.js';

describe('Permission and CSRF security (contract)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let auth: AuthHelper;

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
  });

  it('requires only a permission check and rejects a missing permission', async () => {
    const user = await auth.registerAndLogin({
      email: 'permission-only@test.com',
      password: 'Password123!',
      firstName: 'Permission',
      lastName: 'Only',
    });

    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Cookie', user.cookies)
      .expect(403);
  });

  it('rejects cookie-authenticated Nest mutations without a CSRF token', async () => {
    const admin = await auth.setupAdmin();

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', admin.cookies)
      .send({
        email: 'created@test.com',
        firstName: 'Created',
        lastName: 'User',
      })
      .expect(403);
  });

  it('allows a Nest mutation with the double-submit CSRF token', async () => {
    const admin = await auth.setupAdmin();
    const safeResponse = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Cookie', admin.cookies)
      .expect(200);
    const match = (safeResponse.get('Set-Cookie') || [])
      .map((cookie) => cookie.match(/__Host-csrf=([^;]+)/))
      .find(Boolean);
    if (!match) throw new Error('CSRF token was not issued.');

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', [...admin.cookies, match[0]])
      .set('X-CSRF-Token', match[1])
      .send({
        email: 'created@test.com',
        firstName: 'Created',
        lastName: 'User',
      })
      .expect(201);
  });
});
