import { HttpStatus } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { TestAppFactory } from './helpers/test-app.factory.js';

describe('Health Module (E2E)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const factory = await TestAppFactory.create();
    app = factory.app;
  });

  afterAll(async () => {
    await TestAppFactory.teardown(app);
  });

  describe('GET /api/health', () => {
    it('should return 200 and available status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.status).toBe('ok');
    });
  });
});
