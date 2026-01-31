import { PrismaService } from '#src/infrastructure/db/prisma/prisma.service.js';
import { RedisService } from '#src/infrastructure/redis/redis.service.js';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AuthHelper } from './helpers/auth.helper.js';
import { RbacHelper } from './helpers/rbac.helper.js';
import { TestAppFactory } from './helpers/test-app.factory.js';
import { resetDb } from './helpers/test-db.helper.js';
import { clearRedisCache } from './helpers/test-redis.helper.js';

describe('RBAC Admin API Contract (E2E)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let redisService: RedisService;
  let authHelper: AuthHelper;
  let rbacHelper: RbacHelper;
  let adminCookies: string[];

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
    await resetDb(prisma);
    await clearRedisCache(redisService);
    await setupAdmin();
  });

  async function setupAdmin() {
    // 1. Register Admin User
    const { userId, cookies } = await authHelper.registerAndLogin({
      email: 'admin@test.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      firstName: 'Admin',
      lastName: 'User',
    });

    // 2. Create Admin Role & Permissions
    const adminRoleId = await rbacHelper.createRole('Admin', 'admin');

    // 3. Assign
    await rbacHelper.assignRoleToUser(userId, adminRoleId);

    // 4. Create necessary permissions for RBAC management (if granular)
    // Assuming 'admin' role has global access or checking guards.
    // Ideally, we should assign 'roles:create', 'roles:read', etc.
    // For now, let's assume 'admin' role bypasses or we need to seed specific perms.
    // Based on previous chats, RbacGuard checks for 'roles:read' etc.
    // So we MUST create them.

    const permissions = [
      ['roles', 'create'],
      ['roles', 'read'],
      ['roles', 'update'],
      ['roles', 'delete'],
      ['permissions', 'create'],
      ['permissions', 'read'],
      ['permissions', 'update'],
      ['permissions', 'delete'],
    ];

    for (const [subject, action] of permissions) {
      const pId = await rbacHelper.createPermission(subject, action);
      await rbacHelper.assignPermissionToRole(adminRoleId, pId);
    }

    // 5. Invalidate & Re-login (to be safe, though Session reload on request should handle it)
    await clearRedisCache(redisService);
    // Refresh cookies not strictly needed if Session is DB-backed read-through, but good practice.
    adminCookies = cookies;
  }

  describe('Roles CRUD', () => {
    it('should create a role successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/roles')
        .set('Cookie', adminCookies)
        .send({
          name: 'Editor',
          slug: 'editor',
          description: 'Editor Role',
        })
        .expect(201);

      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.slug).toBe('editor');
    });

    it('should fail to create duplicate role', async () => {
      await rbacHelper.createRole('Duplicate', 'duplicate');

      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/roles')
        .set('Cookie', adminCookies)
        .send({
          name: 'Duplicate',
          slug: 'duplicate', // Conflict on slug
        })
        .expect(409); // Conflict

      expect(res.body.message).toBeDefined();
    });

    it('should get a role by ID', async () => {
      const id = await rbacHelper.createRole('Viewer', 'viewer');

      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/roles/${id}`)
        .set('Cookie', adminCookies)
        .expect(200);

      expect(res.body.data.slug).toBe('viewer');
    });

    it('should update a role', async () => {
      const id = await rbacHelper.createRole('Updater', 'updater');

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/roles/${id}`)
        .set('Cookie', adminCookies)
        .send({ description: 'Updated Description' })
        .expect(200);

      expect(res.body.data.description).toBe('Updated Description');
    });

    it('should delete a role', async () => {
      const id = await rbacHelper.createRole('Deleter', 'deleter');

      await request(app.getHttpServer())
        .delete(`/api/v1/admin/roles/${id}`)
        .set('Cookie', adminCookies)
        .expect(200);

      // Verify gone
      await request(app.getHttpServer())
        .get(`/api/v1/admin/roles/${id}`)
        .set('Cookie', adminCookies)
        .expect(404);
    });
  });

  describe('Permissions CRUD', () => {
    it('should create permission', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/permissions')
        .set('Cookie', adminCookies)
        .send({
          subject: 'posts',
          action: 'publish',
          description: 'Publish Posts',
        })
        .expect(201);

      expect(res.body.data.action).toBe('publish');
    });
  });

  describe('Role-Permission Mappings', () => {
    it('should append permissions to role', async () => {
      const rId = await rbacHelper.createRole('Mapper', 'mapper');
      const pId = await rbacHelper.createPermission('content', 'edit');

      await request(app.getHttpServer())
        .post(`/api/v1/admin/roles/${rId}/permissions`)
        .set('Cookie', adminCookies)
        .send({ permissionId: pId })
        .expect(201);

      const list = await request(app.getHttpServer())
        .get(`/api/v1/admin/roles/${rId}/permissions`)
        .set('Cookie', adminCookies)
        .expect(200);

      expect(list.body.data).toHaveLength(1);
      expect(list.body.data[0].id).toBe(pId);
    });

    it('should replace permissions for role', async () => {
      const rId = await rbacHelper.createRole('Replacer', 'replacer');
      const p1 = await rbacHelper.createPermission('a', '1');
      const p2 = await rbacHelper.createPermission('b', '2');

      await request(app.getHttpServer())
        .put(`/api/v1/admin/roles/${rId}/permissions`)
        .set('Cookie', adminCookies)
        .send({ permissionIds: [p1, p2] })
        .expect(200);

      const list = await request(app.getHttpServer())
        .get(`/api/v1/admin/roles/${rId}/permissions`)
        .set('Cookie', adminCookies)
        .expect(200);

      expect(list.body.data).toHaveLength(2);
    });
  });
});
