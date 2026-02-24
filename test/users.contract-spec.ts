import { PrismaService, RedisService } from '#src/core/index.js';
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
  let csrfCookie: string | undefined;
  let csrfToken: string | undefined;

  const extractCsrf = (cookies: string[] = []) => {
    for (const c of cookies) {
      const match = c.match(/__Host-csrf=([^;]+)/);
      if (match) return { cookie: c, token: match[1] };
    }
    return undefined;
  };

  const csrfHeaders = (cookies: string[]) => {
    const list =
      csrfCookie && !cookies.includes(csrfCookie)
        ? [...cookies, csrfCookie]
        : cookies;
    const cookieHeader = list.join('; ');
    if (!csrfToken)
      throw new Error('CSRF token missing in Users contract tests');
    return { Cookie: cookieHeader, 'X-CSRF-Token': csrfToken };
  };

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
    await fetchCsrf(adminCookies);
  });

  async function fetchCsrf(cookies: string[]) {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', cookies);
    const setCookies = res.get('Set-Cookie') || [];
    const found = extractCsrf(setCookies) ?? extractCsrf(cookies);
    csrfCookie = found?.cookie ?? csrfCookie;
    csrfToken = found?.token ?? csrfToken;
    if (!csrfToken) throw new Error('CSRF token could not be initialized');
  }

  describe('Users CRUD', () => {
    it('should list users', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Cookie', adminCookies)
        .expect(200);

      expect(res.body.success).toBe(true);
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

      expect(res.body.success).toBe(true);
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
        .set(csrfHeaders(adminCookies))
        .send({ firstName: 'Updated' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();

      // Verify with get
      const get = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}`)
        .set('Cookie', adminCookies)
        .expect(200);
      expect(get.body.success).toBe(true);
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
        .set(csrfHeaders(adminCookies))
        .send({ roleId: rId })
        .expect(201); // or 200

      const list = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}/roles`)
        .set('Cookie', adminCookies)
        .expect(200);

      expect(list.body.success).toBe(true);
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
        .set(csrfHeaders(adminCookies))
        .send({ roleIds: [r1, r2] })
        .expect(200);

      const list = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}/roles`)
        .set('Cookie', adminCookies)
        .expect(200);

      expect(list.body.success).toBe(true);
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
        .set(csrfHeaders(adminCookies))
        .send({ permissionId: 'invalid-uuid', effect: 'ALLOW' })
        .expect(400)
        .expect((res) => {
          expect(res.body.success).toBe(false);
        }); // Validation error
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
        .set(csrfHeaders(adminCookies))
        .send({ permissionId: pId, effect: 'ALLOW' })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });

      const perms = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}/permissions`)
        .set('Cookie', adminCookies)
        .expect(200);

      expect(perms.body.success).toBe(true);
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

      expect(res.body.success).toBe(true);
      expect(res.body.data.permissions).toContain('s:a');
    });
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should return 403 for user without users:read permission', async () => {
      // Create a user with no permissions
      const { cookies } = await authHelper.registerAndLogin({
        email: 'noperm@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'No',
        lastName: 'Permission',
      });
      await clearRedisCache(redisService);

      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Cookie', cookies)
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('should return 403 for non-admin accessing admin-only endpoint', async () => {
      // Create a regular user (not admin)
      const { cookies, userId } = await authHelper.registerAndLogin({
        email: 'regular@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'Regular',
        lastName: 'User',
      });
      await clearRedisCache(redisService);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}/roles`)
        .set('Cookie', cookies)
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent user', async () => {
      const fakeId = 'non-existent-user-id-123';

      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${fakeId}`)
        .set('Cookie', adminCookies)
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('should return 404 for update on non-existent user', async () => {
      const fakeId = 'non-existent-user-id-456';

      const res = await request(app.getHttpServer())
        .put(`/api/v1/users/${fakeId}`)
        .set(csrfHeaders(adminCookies))
        .send({ firstName: 'Test' })
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('should return 409 for duplicate email on create', async () => {
      // First create a user
      await authHelper.registerAndLogin({
        email: 'duplicate@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'First',
        lastName: 'User',
      });

      // Try to create another user with same email
      const res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set(csrfHeaders(adminCookies))
        .send({
          email: 'duplicate@test.com',
          firstName: 'Second',
          lastName: 'User',
          name: 'Second User',
        })
        .expect(409);

      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid email format', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set(csrfHeaders(adminCookies))
        .send({
          email: 'invalid-email',
          firstName: 'Test',
          lastName: 'User',
          name: 'Test User',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('Role & Permission Operations', () => {
    it('should remove role from user', async () => {
      const { userId } = await authHelper.registerAndLogin({
        email: 'removerole@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'Remove',
        lastName: 'Role',
      });
      const roleId = await rbacHelper.createRole('ToRemove', 'toremove');
      await rbacHelper.assignRoleToUser(userId, roleId);
      await clearRedisCache(redisService);

      // Verify role is assigned
      const before = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}/roles`)
        .set('Cookie', adminCookies)
        .expect(200);
      expect(before.body.success).toBe(true);
      expect(before.body.data).toHaveLength(1);

      // Remove the role
      await request(app.getHttpServer())
        .delete(`/api/v1/users/${userId}/roles/${roleId}`)
        .set(csrfHeaders(adminCookies))
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });

      // Verify role is removed
      await clearRedisCache(redisService);
      const after = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}/roles`)
        .set('Cookie', adminCookies)
        .expect(200);
      expect(after.body.success).toBe(true);
      expect(after.body.data).toHaveLength(0);
    });

    it('should remove permission override from user', async () => {
      const { userId } = await authHelper.registerAndLogin({
        email: 'removeperm@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'Remove',
        lastName: 'Perm',
      });
      const permId = await rbacHelper.createPermission('remove', 'test');

      // Add permission override
      await request(app.getHttpServer())
        .post(`/api/v1/users/${userId}/permissions`)
        .set(csrfHeaders(adminCookies))
        .send({ permissionId: permId, effect: 'ALLOW' })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });

      // Remove it
      await request(app.getHttpServer())
        .delete(`/api/v1/users/${userId}/permissions/${permId}`)
        .set(csrfHeaders(adminCookies))
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });

      // Verify it's removed
      const perms = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}/permissions`)
        .set('Cookie', adminCookies)
        .expect(200);
      expect(perms.body.success).toBe(true);
      expect(perms.body.data.allow).toHaveLength(0);
    });

    it('should replace user permissions', async () => {
      const { userId } = await authHelper.registerAndLogin({
        email: 'replaceperm@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'Replace',
        lastName: 'Perm',
      });
      const p1 = await rbacHelper.createPermission('replace', 'one');
      const p2 = await rbacHelper.createPermission('replace', 'two');

      await request(app.getHttpServer())
        .put(`/api/v1/users/${userId}/permissions`)
        .set(csrfHeaders(adminCookies))
        .send({
          overrides: [
            { permissionId: p1, effect: 'ALLOW' },
            { permissionId: p2, effect: 'DENY' },
          ],
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });

      const perms = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}/permissions`)
        .set('Cookie', adminCookies)
        .expect(200);

      expect(perms.body.success).toBe(true);
      expect(perms.body.data.allow).toHaveLength(1);
      expect(perms.body.data.deny).toHaveLength(1);
    });
  });
});
