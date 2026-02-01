import { PrismaService } from '#src/infrastructure/db/prisma/prisma.service.js';
import { RedisService } from '#src/infrastructure/redis/redis.service.js';
import { HttpStatus } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AuthHelper } from './helpers/auth.helper.js';
import { RbacHelper } from './helpers/rbac.helper.js';
import { TestAppFactory } from './helpers/test-app.factory.js';
import { resetDb } from './helpers/test-db.helper.js';
import { clearRedisCache } from './helpers/test-redis.helper.js';

describe('Files Module (E2E)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let redisService: RedisService;
  let authHelper: AuthHelper;
  let rbacHelper: RbacHelper;
  let adminCookies: string[];

  let uploadedFileId: string;
  let publicToken: string;

  beforeAll(async () => {
    const factory = await TestAppFactory.create();
    app = factory.app;
    prisma = factory.prisma;
    redisService = factory.redis;
    authHelper = new AuthHelper(app);
    rbacHelper = new RbacHelper(prisma, redisService);
  });

  afterAll(async () => {
    await TestAppFactory.teardown(app);
  });

  beforeEach(async () => {
    // We don't reset DB every test for speed in this specific suite unless necessary
    // But standardized tests usually do.
    // await resetDb(prisma);
    // await clearRedisCache(redisService);

    // We just need a valid admin session
    if (!adminCookies) {
      await resetDb(prisma);
      await clearRedisCache(redisService);
      const setup = await authHelper.setupAdmin(rbacHelper);
      adminCookies = setup.cookies;
    }
  });

  describe('POST /api/v1/files/upload', () => {
    it('should upload a file successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/files/upload')
        .set('Cookie', adminCookies)
        .attach('file', Buffer.from('test content'), 'test.txt')
        .expect(HttpStatus.CREATED);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.fileName).toBe('test.txt');
      expect(response.body.data.size).toBeDefined();

      uploadedFileId = response.body.data.id;
    });

    it('should fail if no file attached', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/files/upload')
        .set('Cookie', adminCookies)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /api/v1/files/:id', () => {
    it('should retrieve file metadata', async () => {
      // Ensure file exists (if tests run independently or order issues)
      if (!uploadedFileId) {
        const res = await request(app.getHttpServer())
          .post('/api/v1/files/upload')
          .set('Cookie', adminCookies)
          .attach('file', Buffer.from('setup'), 'setup.txt');
        uploadedFileId = res.body.data.id;
      }

      const response = await request(app.getHttpServer())
        .get(`/api/v1/files/${uploadedFileId}`)
        .set('Cookie', adminCookies)
        .expect(HttpStatus.OK);

      expect(response.body.data.id).toBe(uploadedFileId);
    });

    it('should return 404 for non-existent file', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/files/00000000-0000-0000-0000-000000000000')
        .set('Cookie', adminCookies)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('PATCH /api/v1/files/:id/visibility', () => {
    it('should change visibility to public', async () => {
      if (!uploadedFileId) return; // Should exist

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/files/${uploadedFileId}/visibility`)
        .set('Cookie', adminCookies)
        .send({ isPublic: true })
        .expect(HttpStatus.OK);

      expect(response.body.data.isPublic).toBe(true);
      expect(response.body.data.publicUrl).toBeDefined();

      const publicUrl = response.body.data.publicUrl;
      publicToken = publicUrl.split('/').pop();
    });
  });

  describe('GET /api/v1/public/files/:token', () => {
    it('should access file publicly via token', async () => {
      if (!publicToken) return;

      const response = await request(app.getHttpServer()).get(
        `/api/v1/public/files/${publicToken}`,
      );

      if (process.env.STORAGE_DRIVER === 'local') {
        expect(response.status).toBe(200);
      } else {
        expect(response.status).toBe(302);
        expect(response.header.location).toBeDefined();
      }
    });
  });

  describe('GET /api/v1/files/:id/download', () => {
    it('should redirect to signed url or stream', async () => {
      if (!uploadedFileId) return;

      const response = await request(app.getHttpServer())
        .get(`/api/v1/files/${uploadedFileId}/download`)
        .set('Cookie', adminCookies)
        .expect(HttpStatus.OK);

      // For local driver, it streams, so no location header.
      // expect(response.header['content-type']).toBeDefined();
    });
  });
});
