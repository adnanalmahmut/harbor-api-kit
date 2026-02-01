import { configureApp } from '#src/app.bootstrap.js';
import { AppModule } from '#src/app.module.js';
import { PrismaService } from '#src/infrastructure/db/prisma/prisma.service.js';
import { RedisService } from '#src/infrastructure/redis/redis.service.js';
import { AuthGuard } from '#src/modules/auth/presentation/http/guards/auth.guard.js';
import { Permissions } from '#src/modules/rbac/presentation/http/decorators/permissions.decorator.js';
import { Roles } from '#src/modules/rbac/presentation/http/decorators/roles.decorator.js';
import { RbacGuard } from '#src/modules/rbac/presentation/http/guards/rbac.guard.js';
import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthHelper } from './helpers/auth.helper.js';
import { RbacHelper } from './helpers/rbac.helper.js';
import { resetDb } from './helpers/test-db.helper.js';
import { clearRedisCache } from './helpers/test-redis.helper.js';

import { AuthModule } from '#src/modules/auth/auth.module.js';
import { RbacModule } from '#src/modules/rbac/rbac.module.js';

import { AppConfigModule } from '#src/infrastructure/config/app-config.module.js';

@Controller('test-security')
@UseGuards(AuthGuard, RbacGuard)
class TestController {
  @Get('roles-any')
  @Roles(['role-a', 'role-b'], 'ANY')
  rolesAny() {
    return { message: 'ok' };
  }

  @Get('roles-and')
  @Roles(['role-a', 'role-b'], 'AND')
  rolesAnd() {
    return { message: 'ok' };
  }

  @Get('perms-any')
  @Permissions(['perm:a', 'perm:b'], 'ANY')
  permsAny() {
    return { message: 'ok' };
  }

  @Get('perms-and')
  @Permissions(['perm:a', 'perm:b'], 'AND')
  permsAnd() {
    return { message: 'ok' };
  }

  @Get('deny-check')
  @Permissions(['sensitive:read'])
  denyCheck() {
    return { message: 'ok' };
  }
}

describe('Security Config Contract (E2E)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let redisService: RedisService;
  let authHelper: AuthHelper;
  let rbacHelper: RbacHelper;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, AuthModule, RbacModule, AppConfigModule],
      controllers: [TestController],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    configureApp(app);

    prisma = app.get(PrismaService);
    redisService = app.get(RedisService);
    authHelper = new AuthHelper(app);
    rbacHelper = new RbacHelper(prisma, redisService);

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(async () => {
    await resetDb(prisma);
    await clearRedisCache(redisService);
    // Create Roles/Perms
    await rbacHelper.createRole('Role A', 'role-a');
    await rbacHelper.createRole('Role B', 'role-b');
    await rbacHelper.createPermission('perm', 'a'); // perm:a
    await rbacHelper.createPermission('perm', 'b'); // perm:b
    await rbacHelper.createPermission('sensitive', 'read'); // sensitive:read
  });

  describe('Roles Guard', () => {
    it('ANY: should allow access with one matching role', async () => {
      const { userId, cookies } = await authHelper.registerAndLogin({
        email: 'rany@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'TestUser',
        lastName: 'TestLast',
      });
      const rId = (
        await prisma.role.findUniqueOrThrow({ where: { slug: 'role-a' } })
      ).id;
      await rbacHelper.assignRoleToUser(userId, rId);

      await request(app.getHttpServer())
        .get('/api/v1/test-security/roles-any')
        .set('Cookie', cookies)
        .expect(200);
    });

    it('AND: should fail access with only one matching role', async () => {
      const { userId, cookies } = await authHelper.registerAndLogin({
        email: 'rand@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'TestUser',
        lastName: 'TestLast',
      });
      const rId = (
        await prisma.role.findUniqueOrThrow({ where: { slug: 'role-a' } })
      ).id;
      await rbacHelper.assignRoleToUser(userId, rId);

      await request(app.getHttpServer())
        .get('/api/v1/test-security/roles-and')
        .set('Cookie', cookies)
        .expect(403);
    });

    it('AND: should allow access with all matching roles', async () => {
      const { userId, cookies } = await authHelper.registerAndLogin({
        email: 'randok@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'TestUser',
        lastName: 'TestLast',
      });
      const rIdA = (
        await prisma.role.findUniqueOrThrow({ where: { slug: 'role-a' } })
      ).id;
      const rIdB = (
        await prisma.role.findUniqueOrThrow({ where: { slug: 'role-b' } })
      ).id;
      await rbacHelper.assignRoleToUser(userId, rIdA);
      await rbacHelper.assignRoleToUser(userId, rIdB);

      await request(app.getHttpServer())
        .get('/api/v1/test-security/roles-and')
        .set('Cookie', cookies)
        .expect(200);
    });
  });

  describe('Permissions Guard', () => {
    it('ANY: should allow access with one permission', async () => {
      const { userId, cookies } = await authHelper.registerAndLogin({
        email: 'pany@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'TestUser',
        lastName: 'TestLast',
      });
      // Assign RoleA which has perm:a (need to map it)
      // Or just create a role with perm:a
      const rId = await rbacHelper.createRole('P Role', 'p-role');
      const pId = (
        await prisma.permission.findFirstOrThrow({
          where: { subject: 'perm', action: 'a' },
        })
      ).id;
      await rbacHelper.assignPermissionToRole(rId, pId);
      await rbacHelper.assignRoleToUser(userId, rId);

      await request(app.getHttpServer())
        .get('/api/v1/test-security/perms-any')
        .set('Cookie', cookies)
        .expect(200);
    });
  });

  describe('Deny Wins & Cache Safety', () => {
    it('should block access immediately when explicit deny is added', async () => {
      const { userId, cookies } = await authHelper.registerAndLogin({
        email: 'deny@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'TestUser',
        lastName: 'TestLast',
      });

      // 1. Grant Access via Role
      const rId = await rbacHelper.createRole(
        'Sensitive Role',
        'sensitive-role',
      );
      const pId = (
        await prisma.permission.findFirstOrThrow({
          where: { subject: 'sensitive', action: 'read' },
        })
      ).id;
      await rbacHelper.assignPermissionToRole(rId, pId);
      await rbacHelper.assignRoleToUser(userId, rId);

      // 2. Verify Access (Warm Cache)
      await request(app.getHttpServer())
        .get('/api/v1/test-security/deny-check')
        .set('Cookie', cookies)
        .expect(200);

      // 3. Add Deny Override
      await rbacHelper.assignUserPermissionOverride(userId, pId, 'DENY');

      // 4. Verify Forbidden (Immediate effect)
      await request(app.getHttpServer())
        .get('/api/v1/test-security/deny-check')
        .set('Cookie', cookies)
        .expect(403);
    });
  });
});
