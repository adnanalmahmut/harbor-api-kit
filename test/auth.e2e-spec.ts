import { PrismaService, RedisService } from '#src/core/index.js';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AuthHelper } from './helpers/auth.helper.js';
import { TestAppFactory } from './helpers/test-app.factory.js';
import { resetDb } from './helpers/test-db.helper.js';
import { clearRedisCache } from './helpers/test-redis.helper.js';

describe('Better Auth native flow (E2E)', () => {
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

  it('creates a database session and revokes it on sign-out', async () => {
    const { cookies, userId } = await auth.registerAndLogin({
      email: 'flow@test.com',
      password: 'Password123!',
      name: 'Flow User',
    });
    expect(await prisma.session.count({ where: { userId } })).toBeGreaterThan(
      0,
    );

    await request(app.getHttpServer())
      .post('/api/v1/auth/sign-out')
      .set('Cookie', cookies)
      .expect(200);

    expect(await prisma.session.count({ where: { userId } })).toBe(0);
  });
});
