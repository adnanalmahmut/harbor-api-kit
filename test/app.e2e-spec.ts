import { configureApp, createApp } from '#src/app.bootstrap.js';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';

describe('AppController (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = (await createApp({ logger: false })) as NestFastifyApplication;
    configureApp(app);

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/health (GET)', async () => {
    const server = app.getHttpServer();
    const res = await request(server).get('/api/v1/health');

    expect(res.status).toBe(200);
    // ResponseInterceptor wraps the result in "data"
    expect(res.body.data).toHaveProperty('status', 'ok');
  });
});
