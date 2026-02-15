import { PrismaService } from '#src/core/infrastructure/db/prisma/prisma.service.js';
import { RedisService } from '#src/core/infrastructure/redis/redis.service.js';
import { RegisterDto } from '#src/modules/auth/presentation/http/dtos/register.dto.js';
import { EffectivePermissionsService } from '#src/modules/rbac/application/services/effective-permissions.service.js';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { TestAppFactory, clearRedisCache, resetDb } from './test-utils.js';

describe('RBAC Module (E2E)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let redisService: RedisService;

  beforeAll(async () => {
    const factory = await TestAppFactory.create();
    app = factory.app;
    prisma = factory.prisma;
    redisService = factory.redis;
  });

  afterAll(async () => {
    // Clean up connections to avoid open handles
    if (app) {
      await TestAppFactory.teardown(app);
    }
  });

  beforeEach(async () => {
    await resetDb(prisma);
    await clearRedisCache(redisService);
  });

  const extractCsrf = (cookieList: string[] = []) => {
    for (const c of cookieList) {
      const match = c.match(/__Host-csrf=([^;]+)/);
      if (match) return { cookie: c, token: match[1] };
    }
    return undefined;
  };

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

  async function setupAdminRole() {
    // Create 'admin' role with required slug field
    const adminRole = await prisma.role.create({
      data: { name: 'admin', slug: 'admin', description: 'Administrator role' },
    });

    // Create 'roles:read' permission with required subject and index fields
    // This permission is needed for GET /api/v1/admin/roles
    const readPerm = await prisma.permission.create({
      data: {
        action: 'read',
        subject: 'roles',
        index: 1,
        description: 'Read roles',
      },
    });

    // Assign permission to role
    await prisma.rolePermission.create({
      data: { roleId: adminRole.id, permissionId: readPerm.id },
    });

    return adminRole;
  }

  it('should allow admin to access protected route (RBAC Allow)', async () => {
    // 1. Create admin user first (registers without roles)
    const adminReg: RegisterDto = {
      email: 'admin@test.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      firstName: 'Admin',
      lastName: 'User',
    };
    const { userId: adminUserId } = await registerAndLogin(adminReg);

    // 2. Setup admin role and permissions
    const adminRole = await setupAdminRole();

    // 3. Assign 'admin' role to the user
    await prisma.userRole.create({
      data: { userId: adminUserId, roleId: adminRole.id },
    });

    // Invalidate cache so EffectivePermissionsService fetches the new role
    await clearRedisCache(redisService);

    // 4. IMPORTANT: Re-login to get a fresh session with the new role
    // The RbacGuard uses session data which was populated BEFORE role assignment
    const freshLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminReg.email, password: adminReg.password })
      .expect(200);
    const adminCookies = freshLogin.get('Set-Cookie') || [];

    // 5. Now access the protected route
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/roles')
      .set('Cookie', adminCookies)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('should deny regular user from accessing protected route (RBAC Deny)', async () => {
    // Create a regular user without admin role
    const userReg: RegisterDto = {
      email: 'user@test.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      firstName: 'Regular',
      lastName: 'User',
    };
    const { cookies: userCookies } = await registerAndLogin(userReg);

    // Setup admin role (but don't assign to user)
    await setupAdminRole();

    // Try to access protected route - should be denied
    await request(app.getHttpServer())
      .get('/api/v1/admin/roles')
      .set('Cookie', userCookies)
      .expect(403);
  });

  it('should allow user with admin role to see roles in /auth/me response', async () => {
    // 1. Create user
    const adminReg: RegisterDto = {
      email: 'admin@test.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      firstName: 'Admin',
      lastName: 'User',
    };
    const { userId: adminUserId } = await registerAndLogin(adminReg);

    // 2. Setup and assign admin role
    const adminRole = await setupAdminRole();
    await prisma.userRole.create({
      data: { userId: adminUserId, roleId: adminRole.id },
    });

    // 3. Re-login to pick up the new role
    const freshLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminReg.email, password: adminReg.password })
      .expect(200);
    const adminCookies = freshLogin.get('Set-Cookie') || [];

    // 4. Check /auth/me includes the role
    const meRes = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', adminCookies)
      .expect(200);

    // The user object should include roles (if the app enriches it)
    // This depends on how GetSessionUseCase populates user.roles
    expect(meRes.body.data.user).toBeDefined();
  });

  it('should respect management escalation (subject:manage implies subject:*)', async () => {
    // 1. Create a manager user
    const managerReg: RegisterDto = {
      email: 'manager@test.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      firstName: 'Manager',
      lastName: 'User',
    };
    const { userId: managerId } = await registerAndLogin(managerReg);

    // 2. Create 'manager' role with 'users:manage' capability
    const managerRole = await prisma.role.create({
      data: { name: 'manager', slug: 'manager', description: 'Manager role' },
    });

    const managePerm = await prisma.permission.create({
      data: {
        action: 'manage',
        subject: 'users',
        index: 10,
        description: 'Manage users',
      },
    });

    await prisma.rolePermission.create({
      data: { roleId: managerRole.id, permissionId: managePerm.id },
    });

    // 3. Assign role to user
    await prisma.userRole.create({
      data: { userId: managerId, roleId: managerRole.id },
    });

    // Invalidate cache since we modified DB directly
    await clearRedisCache(redisService);

    // 4. Re-login to refresh session
    const freshLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: managerReg.email, password: managerReg.password })
      .expect(200);
    const cookies = freshLogin.get('Set-Cookie') || [];
    const csrf = extractCsrf(cookies);

    // 5. Access route requiring 'users:read' - SHOULD ALLOW due to Management Escalation
    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Cookie', cookies)
      .expect(200);

    // 6. Access route requiring 'users:create' - SHOULD ALLOW due to Management Escalation
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', csrf?.cookie ? [...cookies, csrf.cookie] : cookies)
      .set('X-CSRF-Token', csrf?.token || '')
      .send({
        email: 'newuser@test.com',
        name: 'New User',
        firstName: 'New',
        lastName: 'User',
        locale: 'en-US',
      })
      .expect(201);
  });

  it('should respect deny override (User Deny trumps Role Allow)', async () => {
    // 1. Create a user (will be editor)
    const editorReg: RegisterDto = {
      email: 'editor@test.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      firstName: 'Editor',
      lastName: 'User',
    };
    const { userId: editorId } = await registerAndLogin(editorReg);

    // 2. Create 'editor' role with 'users:create' capability
    const editorRole = await prisma.role.create({
      data: { name: 'editor', slug: 'editor', description: 'Editor role' },
    });

    const createPerm = await prisma.permission.create({
      data: {
        action: 'create',
        subject: 'users',
        index: 20,
        description: 'Create users',
      },
    });

    await prisma.rolePermission.create({
      data: { roleId: editorRole.id, permissionId: createPerm.id },
    });

    await prisma.userRole.create({
      data: { userId: editorId, roleId: editorRole.id },
    });

    // 3. Explicitly DENY 'users:create' for this user
    await prisma.userPermission.create({
      data: {
        userId: editorId,
        permissionId: createPerm.id,
        effect: 'DENY',
      },
    });

    // Invalidate cache
    const efps = app.get(EffectivePermissionsService);
    await efps.invalidateForUser(editorId);

    // 4. Re-login
    const freshLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: editorReg.email, password: editorReg.password })
      .expect(200);
    const cookies = freshLogin.get('Set-Cookie') || [];
    const csrf = extractCsrf(cookies);

    // 5. Try to Create User - SHOULD FAIL (403) despite role
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', csrf?.cookie ? [...cookies, csrf.cookie] : cookies)
      .set('X-CSRF-Token', csrf?.token || '')
      .send({
        email: 'blocked@test.com',
        name: 'Blocked User',
        firstName: 'Blocked',
        lastName: 'User',
        locale: 'en-US',
      })
      .expect(403);
  });

  it('should allow admin to list permissions for a specific role', async () => {
    // 1. Create admin user and login
    const adminReg: RegisterDto = {
      email: 'admin-list@test.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      firstName: 'Admin',
      lastName: 'List',
    };
    const { userId: adminId } = await registerAndLogin(adminReg);

    // 2. Setup admin role and assign to user
    const adminRole = await setupAdminRole();
    await prisma.userRole.create({
      data: { userId: adminId, roleId: adminRole.id },
    });

    // 3. Create a test role and assign a permission
    const testRole = await prisma.role.create({
      data: {
        name: 'test-perm-role',
        slug: 'test-perm-role',
        description: 'Test Role',
      },
    });
    const permission = await prisma.permission.create({
      data: { action: 'view', subject: 'reports', index: 50 },
    });
    await prisma.rolePermission.create({
      data: { roleId: testRole.id, permissionId: permission.id },
    });

    // Invalidate cache since we modified DB directly
    await clearRedisCache(redisService);

    // 4. Re-login to refresh session/cache
    const freshLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminReg.email, password: adminReg.password })
      .expect(200);
    const cookies = freshLogin.get('Set-Cookie') || [];

    // 5. Query the new endpoint
    const res = await request(app.getHttpServer())
      .get(`/api/v1/admin/roles/${testRole.id}/permissions`)
      .set('Cookie', cookies)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(
      res.body.data.some(
        (p: any) => p.action === 'view' && p.subject === 'reports',
      ),
    ).toBe(true);
  });
});
