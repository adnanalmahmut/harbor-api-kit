import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { configureApp, createApp } from '../src/app.bootstrap.js';

describe('AppController (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createApp({ logger: false });
    configureApp(app);

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/health (GET)', async () => {
    const server = app.getHttpServer();
    const res = await request(server).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });
});
