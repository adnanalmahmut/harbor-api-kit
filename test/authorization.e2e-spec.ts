import { PrismaService, RedisService } from '#src/core/index.js';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AuthHelper } from './helpers/auth.helper.js';
import { AuthorizationHelper } from './helpers/authorization.helper.js';
import { TestAppFactory } from './helpers/test-app.factory.js';
import { resetDb } from './helpers/test-db.helper.js';
import { clearRedisCache } from './helpers/test-redis.helper.js';

describe('Permission override enforcement (E2E)', () => {
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

  it('removes inherited file access with a DENY override', async () => {
    const { cookies, userId } = await auth.registerAndLogin({
      email: 'files-deny@test.com',
      password: 'Password123!',
      name: 'Files Deny',
    });
    const missingId = '00000000-0000-0000-0000-000000000000';

    await request(app.getHttpServer())
      .get(`/api/v1/files/${missingId}`)
      .set('Cookie', cookies)
      .expect(404);

    await authorization.assignUserPermissionOverride(
      userId,
      'files:read',
      'DENY',
    );
    await request(app.getHttpServer())
      .get(`/api/v1/files/${missingId}`)
      .set('Cookie', cookies)
      .expect(403);
  });
});
