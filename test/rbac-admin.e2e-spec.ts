import { PrismaService } from '#src/infrastructure/db/prisma/prisma.service.js';
import { RedisService } from '#src/infrastructure/redis/redis.service.js';
import { RegisterDto } from '#src/modules/auth/interfaces/http/dtos/register.dto.js';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { TestAppFactory, clearRedisCache, resetDb } from './test-utils.js';

describe('RBAC Admin & User APIs (E2E)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let redisService: RedisService;
  let adminCookies: string[];

  beforeAll(async () => {
    const factory = await TestAppFactory.create();
    app = factory.app;
    prisma = factory.prisma;
    redisService = factory.redis;
  });

  afterAll(async () => {
    if (app) {
      await TestAppFactory.teardown(app);
    }
  });

  beforeEach(async () => {
    await resetDb(prisma);
    await clearRedisCache(redisService);
    await setupAdmin();
  });

  async function registerAndLogin(
    dto: RegisterDto,
  ): Promise<{ cookies: string[]; userId: string }> {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(dto)
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: dto.email, password: dto.password })
      .expect(200);

    const cookies = loginRes.get('Set-Cookie') || [];
    const meRes = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', cookies)
      .expect(200);

    return { cookies, userId: meRes.body.data.user.id };
  }

  async function setupAdmin() {
    // 1. Create Admin User
    const adminReg: RegisterDto = {
      email: 'superadmin@test.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      firstName: 'Super',
      lastName: 'Admin',
    };
    const { cookies, userId } = await registerAndLogin(adminReg);
    adminCookies = cookies;

    // 2. Create 'admin' role
    const adminRole = await prisma.role.create({
      data: { name: 'admin', slug: 'admin', description: 'Administrator' },
    });

    // 3. Create 'users:read' permission (required for verifying user update)
    const userReadPerm = await prisma.permission.create({
      data: {
        action: 'read',
        subject: 'users',
        description: 'Read Users',
        index: 999,
      },
    });

    // 4. Assign role and permission to user/role
    await prisma.userRole.create({
      data: { userId, roleId: adminRole.id },
    });
    await prisma.rolePermission.create({
      data: { roleId: adminRole.id, permissionId: userReadPerm.id },
    });

    // 5. Force refresh permissions (invalidate cache)
    await clearRedisCache(redisService);

    // 5. Re-login to get updated session with roles (if stored in session/token)
    // In this architecture, roles are fetched on request or cached, preventing stale session is key.
    // We update adminCookies just in case.
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminReg.email, password: adminReg.password })
      .expect(200);
    adminCookies = loginRes.get('Set-Cookie') || [];
  }

  it('should support Role CRUD', async () => {
    // CREATE
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/admin/roles')
      .set('Cookie', adminCookies)
      .send({
        name: 'Editor',
        slug: 'editor',
        description: 'Editor Role',
      })
      .expect(201);

    expect(createRes.body.data.id).toBeDefined();
    const roleId = createRes.body.data.id;

    // GET
    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/admin/roles/${roleId}`)
      .set('Cookie', adminCookies)
      .expect(200);
    expect(getRes.body.data.slug).toBe('editor');

    // UPDATE
    const updateRes = await request(app.getHttpServer())
      .patch(`/api/v1/admin/roles/${roleId}`)
      .set('Cookie', adminCookies)
      .send({ description: 'Updated Editor Role' })
      .expect(200);
    expect(updateRes.body.data.description).toBe('Updated Editor Role');

    // DELETE
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/roles/${roleId}`)
      .set('Cookie', adminCookies)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/admin/roles/${roleId}`)
      .set('Cookie', adminCookies)
      .expect(404);
  });

  it('should support Permission CRUD', async () => {
    // CREATE
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/admin/permissions')
      .set('Cookie', adminCookies)
      .send({
        action: 'publish',
        subject: 'posts',
        description: 'Publish posts',
      })
      .expect(201);

    expect(createRes.body.data.id).toBeDefined();
    const permId = createRes.body.data.id;

    // GET
    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/admin/permissions/${permId}`)
      .set('Cookie', adminCookies)
      .expect(200);
    expect(getRes.body.data.action).toBe('publish');

    // UPDATE
    const updateRes = await request(app.getHttpServer())
      .patch(`/api/v1/admin/permissions/${permId}`)
      .set('Cookie', adminCookies)
      .send({ description: 'Updated Publish' })
      .expect(200);
    expect(updateRes.body.data.description).toBe('Updated Publish');

    // DELETE
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/permissions/${permId}`)
      .set('Cookie', adminCookies)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/admin/permissions/${permId}`)
      .set('Cookie', adminCookies)
      .expect(404);
  });

  it('should replace Role Permissions', async () => {
    // Setup Role and Permissions
    const role = await prisma.role.create({
      data: { name: 'Test', slug: 'test' },
    });
    const p1 = await prisma.permission.create({
      data: { action: 'a', subject: 's', index: 1 },
    });
    const p2 = await prisma.permission.create({
      data: { action: 'b', subject: 's', index: 2 },
    });

    // Replace with [p1, p2]
    await request(app.getHttpServer())
      .put(`/api/v1/admin/roles/${role.id}/permissions`)
      .set('Cookie', adminCookies)
      .send({ permissionIds: [p1.id, p2.id] })
      .expect(200);

    // Verify
    const res = await request(app.getHttpServer())
      .get(`/api/v1/admin/roles/${role.id}/permissions`)
      .set('Cookie', adminCookies)
      .expect(200);
    expect(res.body.data).toHaveLength(2);

    // Replace with empty
    await request(app.getHttpServer())
      .put(`/api/v1/admin/roles/${role.id}/permissions`)
      .set('Cookie', adminCookies)
      .send({ permissionIds: [] })
      .expect(200);

    const res2 = await request(app.getHttpServer())
      .get(`/api/v1/admin/roles/${role.id}/permissions`)
      .set('Cookie', adminCookies)
      .expect(200);
    expect(res2.body.data).toHaveLength(0);
  });

  it('should manage User Roles and Permissions', async () => {
    // Create Target User
    const targetReg: RegisterDto = {
      email: 'target@test.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      firstName: 'Target',
      lastName: 'User',
    };
    const { userId: targetId } = await registerAndLogin(targetReg);

    // Setup Roles and Permissions
    const r1 = await prisma.role.create({ data: { name: 'R1', slug: 'r1' } });
    const p1 = await prisma.permission.create({
      data: { action: 'x', subject: 'y', index: 1 },
    });

    // 1. Replace User Roles
    await request(app.getHttpServer())
      .put(`/api/v1/users/${targetId}/roles`)
      .set('Cookie', adminCookies)
      .send({ roleIds: [r1.id] })
      .expect(200);

    const rolesRes = await request(app.getHttpServer())
      .get(`/api/v1/users/${targetId}/roles`)
      .set('Cookie', adminCookies)
      .expect(200);
    expect(rolesRes.body.data).toHaveLength(1);
    expect(rolesRes.body.data[0].slug).toBe('r1');

    // 2. Replace User Permissions (Overrides)
    await request(app.getHttpServer())
      .put(`/api/v1/users/${targetId}/permissions`)
      .set('Cookie', adminCookies)
      .send({ overrides: [{ permissionId: p1.id, effect: 'DENY' }] })
      .expect(200);

    const permsRes = await request(app.getHttpServer())
      .get(`/api/v1/users/${targetId}/permissions`)
      .set('Cookie', adminCookies)
      .expect(200);
    expect(permsRes.body.data.deny).toHaveLength(1);
    expect(permsRes.body.data.deny[0].effect).toBe('DENY');

    // 3. Check Effective Permissions (Should verify logic)
    // Assign p1 to r1
    await prisma.rolePermission.create({
      data: { roleId: r1.id, permissionId: p1.id },
    });
    await clearRedisCache(redisService);

    // r1 grants p1 (ALLOW), but user override is DENY. Effective should be DENY/empty?
    // Depending on logic, if override denies, it shouldn't appear in list OR appear as denied?
    // Our effective permissions usually return ALLOWED string "subject:action".
    // If DENIED, it should NOT appear.

    const effRes = await request(app.getHttpServer())
      .get(`/api/v1/users/${targetId}/effective-permissions`)
      .set('Cookie', adminCookies)
      .expect(200);

    // logic: role gives x:y (ALLOW). User override gives x:y (DENY).
    // Result: x:y should NOT be present.
    expect(effRes.body.data).not.toContain('y:x');
  });

  it('should allow Admin to update user profile', async () => {
    // Create User
    const userReg: RegisterDto = {
      email: 'update_me@test.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      firstName: 'Old',
      lastName: 'Name',
    };
    const { userId } = await registerAndLogin(userReg);

    // Update
    const updateRes = await request(app.getHttpServer())
      .put(`/api/v1/users/${userId}`)
      .set('Cookie', adminCookies)
      .send({ firstName: 'New', lastName: 'Updated' })
      .expect(200);
    expect(updateRes.body.message).toBeDefined();

    // Verify
    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/users/${userId}`)
      .set('Cookie', adminCookies)
      .expect(200);
    expect(getRes.body.data.firstName).toBe('New');
    expect(getRes.body.data.lastName).toBe('Updated');

    // Not Found case
    await request(app.getHttpServer())
      .put(`/api/v1/users/00000000-0000-0000-0000-000000000000`)
      .set('Cookie', adminCookies)
      .send({ firstName: 'Ghost' })
      .expect(404);
  });
});
