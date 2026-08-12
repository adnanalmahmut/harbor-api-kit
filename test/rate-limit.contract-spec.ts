import { PrismaService, RedisService } from '#src/core/index.js';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { TestAppFactory, clearRedisCache, resetDb } from './test-utils.js';

describe('Rate Limit (contract)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let redis: RedisService;

  beforeAll(async () => {
    const factory = await TestAppFactory.create();
    app = factory.app;
    prisma = factory.prisma;
    redis = factory.redis;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDb(prisma);
    await clearRedisCache(redis);

    await request(app.getHttpServer())
      .post('/api/v1/auth/sign-up/email')
      .send({
        email: 'rate@test.com',
        password: 'Password123!',
        firstName: 'Rate',
        lastName: 'Limit',
      })
      .expect(200);
  });
  // english msg
  it('s supposed to return 429 after exceeding the specified /auth/login limit', async () => {
    const payload = { email: 'rate@test.com', password: 'WrongPass123!' };

    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/sign-in/email')
        .send(payload)
        .expect(401);
    }

    await request(app.getHttpServer())
      .post('/api/v1/auth/sign-in/email')
      .send(payload)
      .expect(429);
  });
});
