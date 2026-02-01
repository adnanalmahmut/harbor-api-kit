import { PrismaService } from '#src/infrastructure/db/prisma/prisma.service.js';
import { RedisService } from '#src/infrastructure/redis/redis.service.js';
import { RegisterDto } from '#src/modules/auth/presentation/http/dtos/register.dto.js';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { TestAppFactory, clearRedisCache, resetDb } from './test-utils.js';

describe('Security Module (E2E)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let redisService: RedisService;
  let cookies: string[];

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

    const regDto: RegisterDto = {
      email: 'sec@test.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      firstName: 'Sec',
      lastName: 'User',
    };
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(regDto);
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: regDto.email, password: regDto.password });
    cookies = loginRes.get('Set-Cookie') || [];
  });

  it('should block POST requests without CSRF token when browser-like headers are present', async () => {
    // The CSRF guard only applies when:
    // 1. The request is "browser-like" (has sec-fetch-*, origin, or referer headers)
    // 2. The request has auth cookies
    // 3. The method is unsafe (POST, PUT, DELETE, PATCH)
    await request(app.getHttpServer())
      .post('/api/v1/auth/sign-out')
      .set('Cookie', cookies)
      .set('Origin', 'http://localhost:5001') // Make request browser-like
      .expect(403);
  });

  it('should allow POST requests with valid CSRF token', async () => {
    // First, get a CSRF token by making a GET request with browser headers
    const getRes = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', cookies)
      .set('Origin', 'http://localhost:5001')
      .expect(200);

    // Extract CSRF cookie from response
    const setCookies = getRes.get('Set-Cookie') || [];
    const csrfCookie = setCookies.find((c: string) =>
      c.includes('__Host-csrf='),
    );

    if (csrfCookie) {
      // Extract token value
      const match = csrfCookie.match(/__Host-csrf=([^;]+)/);
      const csrfToken = match ? match[1] : '';

      // Make POST with CSRF header
      await request(app.getHttpServer())
        .post('/api/v1/auth/sign-out')
        .set('Cookie', [...cookies, csrfCookie])
        .set('Origin', 'http://localhost:5001')
        .set('X-CSRF-Token', csrfToken)
        .expect(200);
    }
  });

  it('should allow POST requests from non-browser clients (no CSRF required)', async () => {
    // Supertest without browser headers should bypass CSRF
    await request(app.getHttpServer())
      .post('/api/v1/auth/sign-out')
      .set('Cookie', cookies)
      // No Origin/Referer/sec-fetch-* headers = non-browser client
      .expect(200);
  });
});
