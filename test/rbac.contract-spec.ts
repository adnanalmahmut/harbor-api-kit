import { PrismaService, RedisService } from '#src/core/index.js';
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
      throw new Error('CSRF token missing in RBAC contract tests');
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
    await setupAdmin();
    await fetchCsrf(adminCookies);
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

  describe('Roles CRUD', () => {
    it('should create a role successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/roles')
        .set(csrfHeaders(adminCookies))
        .send({
          name: 'Editor',
          slug: 'editor',
          description: 'Editor Role',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.slug).toBe('editor');
    });

    it('should fail to create duplicate role', async () => {
      await rbacHelper.createRole('Duplicate', 'duplicate');

      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/roles')
        .set(csrfHeaders(adminCookies))
        .send({
          name: 'Duplicate',
          slug: 'duplicate', // Conflict on slug
        })
        .expect(409); // Conflict

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBeDefined();
    });

    it('should get a role by ID', async () => {
      const id = await rbacHelper.createRole('Viewer', 'viewer');

      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/roles/${id}`)
        .set('Cookie', adminCookies)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe('viewer');
    });

    it('should update a role', async () => {
      const id = await rbacHelper.createRole('Updater', 'updater');

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/roles/${id}`)
        .set(csrfHeaders(adminCookies))
        .send({ description: 'Updated Description' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.description).toBe('Updated Description');
    });

    it('should delete a role', async () => {
      const id = await rbacHelper.createRole('Deleter', 'deleter');

      await request(app.getHttpServer())
        .delete(`/api/v1/admin/roles/${id}`)
        .set(csrfHeaders(adminCookies))
        .expect(200);

      // Verify gone
      await request(app.getHttpServer())
        .get(`/api/v1/admin/roles/${id}`)
        .set('Cookie', adminCookies)
        .expect(404)
        .expect((res) => {
          expect(res.body.success).toBe(false);
        });
    });
  });

  describe('Permissions CRUD', () => {
    it('should create permission', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/permissions')
        .set(csrfHeaders(adminCookies))
        .send({
          subject: 'posts',
          action: 'publish',
          description: 'Publish Posts',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.action).toBe('publish');
    });
  });

  describe('Role-Permission Mappings', () => {
    it('should append permissions to role', async () => {
      const rId = await rbacHelper.createRole('Mapper', 'mapper');
      const pId = await rbacHelper.createPermission('content', 'edit');

      await request(app.getHttpServer())
        .post(`/api/v1/admin/roles/${rId}/permissions`)
        .set(csrfHeaders(adminCookies))
        .send({ permissionId: pId })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });

      const list = await request(app.getHttpServer())
        .get(`/api/v1/admin/roles/${rId}/permissions`)
        .set('Cookie', adminCookies)
        .expect(200);

      expect(list.body.success).toBe(true);
      expect(list.body.data).toHaveLength(1);
      expect(list.body.data[0].id).toBe(pId);
    });

    it('should replace permissions for role', async () => {
      const rId = await rbacHelper.createRole('Replacer', 'replacer');
      const p1 = await rbacHelper.createPermission('a', '1');
      const p2 = await rbacHelper.createPermission('b', '2');

      await request(app.getHttpServer())
        .put(`/api/v1/admin/roles/${rId}/permissions`)
        .set(csrfHeaders(adminCookies))
        .send({ permissionIds: [p1, p2] })
        .expect(200);

      const list = await request(app.getHttpServer())
        .get(`/api/v1/admin/roles/${rId}/permissions`)
        .set('Cookie', adminCookies)
        .expect(200);

      expect(list.body.success).toBe(true);
      expect(list.body.data).toHaveLength(2);
    });
  });
  describe('Cache Invalidation (Immediate Effect)', () => {
    let userBCookies: string[];
    let userBId: string;
    let usersReadPermissionId: string;

    const protectedEndpoint = '/api/v1/users';

    const requestProtectedAsUserB = (status: number) =>
      request(app.getHttpServer())
        .get(protectedEndpoint)
        .set('Cookie', userBCookies)
        .expect(status)
        .expect((res) => {
          expect(res.body.success).toBe(status < 400);
        });

    async function ensureUsersReadPermission(): Promise<string> {
      const existing = await rbacHelper.getPermission('users', 'read');
      if (existing) return existing.id;

      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/permissions')
        .set(csrfHeaders(adminCookies))
        .send({
          subject: 'users',
          action: 'read',
          description: 'users read',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      return res.body.data.id;
    }

    async function createLimitedRole(): Promise<string> {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/roles')
        .set(csrfHeaders(adminCookies))
        .send({
          name: 'Limited',
          slug: 'limited',
          description: 'Limited role for cache invalidation tests',
        })
        .expect(201);

      const roleId = res.body.data.id;
      expect(res.body.success).toBe(true);

      await request(app.getHttpServer())
        .post(`/api/v1/admin/roles/${roleId}/permissions`)
        .set(csrfHeaders(adminCookies))
        .send({ permissionId: usersReadPermissionId })
        .expect(201)
        .expect((r) => {
          expect(r.body.success).toBe(true);
        });

      return roleId;
    }

    async function assignRoleToUser(roleId: string) {
      await request(app.getHttpServer())
        .post(`/api/v1/users/${userBId}/roles`)
        .set(csrfHeaders(adminCookies))
        .send({ roleId })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    }

    async function unassignRoleFromUser(roleId: string) {
      await request(app.getHttpServer())
        .delete(`/api/v1/users/${userBId}/roles/${roleId}`)
        .set(csrfHeaders(adminCookies))
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    }

    async function setUserOverride(effect: 'ALLOW' | 'DENY') {
      await request(app.getHttpServer())
        .put(`/api/v1/users/${userBId}/permissions`)
        .set(csrfHeaders(adminCookies))
        .send({
          overrides: [{ permissionId: usersReadPermissionId, effect }],
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    }

    beforeEach(async () => {
      // Create User B (Must be done after resetDb, which runs in outer beforeEach)
      const res = await authHelper.registerAndLogin({
        email: 'userb@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'User',
        lastName: 'Bee',
      });
      userBCookies = res.cookies;
      userBId = res.userId;
      usersReadPermissionId = await ensureUsersReadPermission();
    });

    it('يحدث ترقية للإذن مباشرة بعد تعيين الدور حتى مع وجود كاش مرفوض مسبقاً', async () => {
      const roleId = await createLimitedRole();

      await requestProtectedAsUserB(403); // يبني كاش رفض

      await assignRoleToUser(roleId);

      await requestProtectedAsUserB(200);
    });

    it('يمنع فوراً بعد تطبيق Override بالمنع حتى لو كان الكاش يسمح', async () => {
      const roleId = await createLimitedRole();
      await assignRoleToUser(roleId);

      await requestProtectedAsUserB(200); // يبني كاش سماح

      await setUserOverride('DENY');

      await requestProtectedAsUserB(403);
    });

    it('يعيد السماح فوراً بعد تحويل الـ Override من المنع إلى السماح مع وجود كاش منع', async () => {
      const roleId = await createLimitedRole();
      await assignRoleToUser(roleId);

      await setUserOverride('DENY');
      await requestProtectedAsUserB(403); // يبني كاش منع

      await setUserOverride('ALLOW');

      await requestProtectedAsUserB(200);
    });

    it('يلغي السماح المخبأ مباشرة بعد إزالة الدور', async () => {
      const roleId = await createLimitedRole();
      await assignRoleToUser(roleId);
      await requestProtectedAsUserB(200); // يبني كاش سماح

      await unassignRoleFromUser(roleId);

      await requestProtectedAsUserB(403);
    });
  });
});
