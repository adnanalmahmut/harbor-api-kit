import { PrismaService, RedisService } from '#src/core/index.js';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AuthHelper } from './helpers/auth.helper.js';
import { AuthorizationHelper } from './helpers/authorization.helper.js';
import { TestAppFactory } from './helpers/test-app.factory.js';
import { resetDb } from './helpers/test-db.helper.js';
import { clearRedisCache } from './helpers/test-redis.helper.js';

describe('Static authorization policy (contract)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let auth: AuthHelper;
  let authorization: AuthorizationHelper;

  beforeAll(async () => {
    const factory = await TestAppFactory.create();
    app = factory.app;
    prisma = factory.prisma;
    redis = factory.redis;
    auth = new AuthHelper(app);
    authorization = new AuthorizationHelper(prisma, redis);
  });

  afterAll(async () => TestAppFactory.teardown(app));

  beforeEach(async () => {
    await resetDb(prisma);
    await clearRedisCache(redis);
  });

  it('inherits permissions directly from the static admin role', async () => {
    const { cookies } = await auth.setupAdmin();
    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Cookie', cookies)
      .expect(200);
  });

  it('denies a default user without the required permission', async () => {
    const { cookies } = await auth.registerAndLogin({
      email: 'default@test.com',
      password: 'Password123!',
      firstName: 'Default',
      lastName: 'User',
    });
    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Cookie', cookies)
      .expect(403);
  });

  it('adds a permission with an ALLOW override', async () => {
    const { cookies, userId } = await auth.registerAndLogin({
      email: 'allow@test.com',
      password: 'Password123!',
      firstName: 'Allowed',
      lastName: 'User',
    });
    await authorization.assignUserPermissionOverride(
      userId,
      'user:list',
      'ALLOW',
    );

    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Cookie', cookies)
      .expect(200);
  });

  it('uses a DENY override over an admin role grant', async () => {
    const { cookies, userId } = await auth.setupAdmin();
    await authorization.assignUserPermissionOverride(
      userId,
      'user:list',
      'DENY',
    );

    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Cookie', cookies)
      .expect(403);
  });
});
