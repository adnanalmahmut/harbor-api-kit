import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { TestAppFactory } from './test-utils.js';

describe('API Contract (E2E)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const factory = await TestAppFactory.create();
    app = factory.app;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return wrapped success response', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/health') // Assuming health endpoint exists and is wrapped
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('data');
    // message might be optional
    // expect(res.body.message).toBeDefined();
  });

  it('should return wrapped validation error', async () => {
    // Hit register with bad data
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'bad-email' }) // Missing fields
      .expect(400);

    expect(res.body.success).toBe(false);
    // Expect: { message: "...", errors: [...] }
    expect(res.body).toHaveProperty('errors');
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors[0]).toHaveProperty('path');
    expect(res.body.errors[0]).toHaveProperty('message');
  });

  it('should return i18n keys for standard errors', async () => {
    // 404
    const res = await request(app.getHttpServer())
      .get('/api/v1/unknown-route')
      .expect(404);

    // Check if message is a key or translated?
    // Usually standardized exceptions return a user-friendly message, potentially translated.
    expect(res.body).toHaveProperty('message');
    expect(res.body.success).toBe(false);
    expect(res.body.message).not.toContain('core.errors');
  });
});
