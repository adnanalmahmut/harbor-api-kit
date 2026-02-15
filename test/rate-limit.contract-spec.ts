import { PrismaService } from '#src/core/infrastructure/db/prisma/prisma.service.js';
import { RedisService } from '#src/core/infrastructure/redis/redis.service.js';
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
      .post('/api/v1/auth/register')
      .send({
        email: 'rate@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'Rate',
        lastName: 'Limit',
      })
      .expect(201);
  });

  it('ينبغي أن يعيد 429 بعد تجاوز حد /auth/login المحدد', async () => {
    const payload = { email: 'rate@test.com', password: 'WrongPass123!' };

    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(payload)
        .expect(401);
    }

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(payload)
      .expect(429)
      .expect((res) => {
        expect(res.body.success).toBe(false);
        expect(typeof res.body.message).toBe('string');
        expect(res.body.message).not.toContain('core.errors');
      });
  });
});
