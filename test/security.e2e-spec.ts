import { PrismaService, RedisService } from '#src/core/index.js';
import { RegisterDto } from '#src/modules/auth/index.js';
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

  it('should block POST requests with auth cookies when CSRF header is missing', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/sign-out')
      .set('Cookie', cookies)
      .expect(403)
      .expect((res) => {
        expect(res.body.success).toBe(false);
        expect(typeof res.body.message).toBe('string');
        expect(res.body.message).not.toContain('core.errors');
      });
  });

  it('should allow POST requests with valid CSRF token', async () => {
    const extractCsrf = (cookieList: string[] = []) => {
      for (const c of cookieList) {
        const match = c.match(/__Host-csrf=([^;]+)/);
        if (match) return { cookie: c, token: match[1] };
      }
      return undefined;
    };

    const getRes = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', cookies)
      .expect(200);

    const setCookies = getRes.get('Set-Cookie') || [];
    // Check both new Set-Cookie and original login cookies
    const csrf = extractCsrf(setCookies) ?? extractCsrf(cookies);

    expect(csrf).toBeDefined();
    expect(csrf!.token).toBeTruthy();

    // Make POST with CSRF header
    await request(app.getHttpServer())
      .post('/api/v1/auth/sign-out')
      .set('Cookie', [...cookies, csrf!.cookie])
      .set('X-CSRF-Token', csrf!.token)
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
      });
  });
});
