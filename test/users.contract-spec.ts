import { PrismaService } from '#src/infrastructure/db/prisma/prisma.service.js';
import { RedisService } from '#src/infrastructure/redis/redis.service.js';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AuthHelper } from './helpers/auth.helper.js';
import { RbacHelper } from './helpers/rbac.helper.js';
import { TestAppFactory } from './helpers/test-app.factory.js';
import { resetDb } from './helpers/test-db.helper.js';
import { clearRedisCache } from './helpers/test-redis.helper.js';

describe('Users API Contract (E2E)', () => {
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
    const { cookies } = await authHelper.setupAdmin(rbacHelper);
    await clearRedisCache(redisService);
    adminCookies = cookies;
  });

  describe('Users CRUD', () => {
    it('should list users', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Cookie', adminCookies)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should get user by ID', async () => {
      // Create a target user
      const { userId } = await authHelper.registerAndLogin({
        email: 'target@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'Target',
        lastName: 'User',
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}`)
        .set('Cookie', adminCookies)
        .expect(200);

      expect(res.body.data.email).toBe('target@test.com');
    });

    it('should update user', async () => {
      const { userId } = await authHelper.registerAndLogin({
        email: 'updateme@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'Target',
        lastName: 'User',
      });

      const res = await request(app.getHttpServer())
        .put(`/api/v1/users/${userId}`)
        .set('Cookie', adminCookies)
        .send({ firstName: 'Updated' })
        .expect(200);

      expect(res.body.data).toBeDefined();

      // Verify with get
      const get = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}`)
        .set('Cookie', adminCookies)
        .expect(200);
      expect(get.body.data.firstName).toBe('Updated');
    });
  });

  describe('User Roles Management', () => {
    it('should add role to user', async () => {
      const { userId } = await authHelper.registerAndLogin({
        email: 'role@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'Role',
        lastName: 'Test',
      });
      const rId = await rbacHelper.createRole('MyRole', 'myrole');

      await request(app.getHttpServer())
        .post(`/api/v1/users/${userId}/roles`)
        .set('Cookie', adminCookies)
        .send({ roleId: rId })
        .expect(201); // or 200

      const list = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}/roles`)
        .set('Cookie', adminCookies)
        .expect(200);

      expect(list.body.data).toHaveLength(1);
      expect(list.body.data[0].slug).toBe('myrole');
    });

    it('should replace user roles', async () => {
      const { userId } = await authHelper.registerAndLogin({
        email: 'replace@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'Role',
        lastName: 'Test',
      });
      const r1 = await rbacHelper.createRole('R1', 'r1');
      const r2 = await rbacHelper.createRole('R2', 'r2');

      await request(app.getHttpServer())
        .put(`/api/v1/users/${userId}/roles`)
        .set('Cookie', adminCookies)
        .send({ roleIds: [r1, r2] })
        .expect(200);

      const list = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}/roles`)
        .set('Cookie', adminCookies)
        .expect(200);

      expect(list.body.data).toHaveLength(2);
    });
  });

  describe('User Permission Overrides', () => {
    it('should add invalid permission override (Validation)', async () => {
      const { userId } = await authHelper.registerAndLogin({
        email: 'perm@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'Role',
        lastName: 'Test',
      });

      await request(app.getHttpServer())
        .post(`/api/v1/users/${userId}/permissions`)
        .set('Cookie', adminCookies)
        .send({ permissionId: 'invalid-uuid', effect: 'ALLOW' })
        .expect(400); // Validation error
    });

    it('should add allow override', async () => {
      const { userId } = await authHelper.registerAndLogin({
        email: 'permok@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'Role',
        lastName: 'Test',
      });
      const pId = await rbacHelper.createPermission('foo', 'bar');

      await request(app.getHttpServer())
        .post(`/api/v1/users/${userId}/permissions`)
        .set('Cookie', adminCookies)
        .send({ permissionId: pId, effect: 'ALLOW' })
        .expect(201);

      const perms = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}/permissions`)
        .set('Cookie', adminCookies)
        .expect(200);

      expect(perms.body.data.allow).toHaveLength(1);
      expect(perms.body.data.allow[0].key.subject).toBe('foo');
      expect(perms.body.data.allow[0].key.action).toBe('bar');
    });
  });

  describe('Effective Permissions', () => {
    it('should return effective permissions', async () => {
      const { userId } = await authHelper.registerAndLogin({
        email: 'eff@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'Role',
        lastName: 'Test',
      });
      // create role with p1, assign to user
      const r1 = await rbacHelper.createRole('Role1', 'role1');
      const p1 = await rbacHelper.createPermission('s', 'a');
      await rbacHelper.assignPermissionToRole(r1, p1);
      await rbacHelper.assignRoleToUser(userId, r1);

      // check effective
      await clearRedisCache(redisService); // force refresh

      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}/effective-permissions`)
        .set('Cookie', adminCookies)
        .expect(200);

      expect(res.body.data.permissions).toContain('s:a');
    });
  });
});
