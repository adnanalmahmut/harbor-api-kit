import { PrismaService } from '#src/infrastructure/db/prisma/prisma.service.js';
import { RedisService } from '#src/infrastructure/redis/redis.service.js';
import { RegisterDto } from '#src/modules/auth/presentation/http/dtos/register.dto.js';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { TestAppFactory, clearRedisCache, resetDb } from './test-utils.js';

describe('Auth Module (E2E)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let redisService: RedisService;

  beforeAll(async () => {
    const factory = await TestAppFactory.create();
    app = factory.app;
    prisma = factory.prisma;
    redisService = factory.redis;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDb(prisma);
    await clearRedisCache(redisService);
  });

  const registerDto: RegisterDto = {
    email: 'test@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    firstName: 'Test',
    lastName: 'User',
  };

  it('should register, login, cache session, and logout', async () => {
    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(registerDto)
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: registerDto.email, password: registerDto.password })
      .expect(200);

    const loginCookies = loginRes.get('Set-Cookie') || [];
    expect(loginCookies).toBeDefined();
    expect(loginCookies.length).toBeGreaterThan(0);

    const meRes1 = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', loginCookies)
      .expect(200);

    expect(meRes1.body.data.user.email).toBe(registerDto.email);

    await request(app.getHttpServer())
      .post('/api/v1/auth/sign-out')
      .set('Cookie', loginCookies)
      .expect(200);

    // After logout, session should be invalidated
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', loginCookies)
      .expect(401);
  });
});
