import { PrismaService, RedisService } from '#src/core/index.js';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AuthHelper } from './helpers/auth.helper.js';
import { AuthorizationHelper } from './helpers/authorization.helper.js';
import { TestAppFactory } from './helpers/test-app.factory.js';
import { resetDb } from './helpers/test-db.helper.js';
import { clearRedisCache } from './helpers/test-redis.helper.js';

describe('Better Auth admin plugin (E2E)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let auth: AuthHelper;
  let authorization: AuthorizationHelper;

  beforeAll(async () => {
    const factory = await TestAppFactory.create();
    app = factory.app;
    prisma = factory.prisma;
    redis = factory.redis;
    auth = new AuthHelper(app);
    authorization = new AuthorizationHelper(prisma, redis);
  });

  afterAll(async () => TestAppFactory.teardown(app));

  beforeEach(async () => {
    await resetDb(prisma);
    await clearRedisCache(redis);
  });

  it('changes a user role through the native admin endpoint', async () => {
    const admin = await auth.setupAdmin();
    const target = await auth.registerAndLogin({
      email: 'target@test.com',
      password: 'Password123!',
      name: 'Target User',
    });

    await request(app.getHttpServer())
      .post('/api/v1/auth/admin/set-role')
      .set('Cookie', admin.cookies)
      .send({ userId: target.userId, role: 'admin' })
      .expect(200);

    const updated = await prisma.user.findUniqueOrThrow({
      where: { id: target.userId },
      select: { role: true },
    });
    expect(updated.role).toBe('admin');
  });

  it('creates and renames users through the admin plugin', async () => {
    const admin = await auth.setupAdmin();

    const created = await request(app.getHttpServer())
      .post('/api/v1/auth/admin/create-user')
      .set('Cookie', admin.cookies)
      .send({
        email: 'admin-created@test.com',
        password: 'Password123!',
        name: 'Admin Created',
      })
      .expect(200);

    expect(created.body.user).toMatchObject({
      email: 'admin-created@test.com',
      name: 'Admin Created',
    });

    const userId = created.body.user.id as string;
    const updated = await request(app.getHttpServer())
      .post('/api/v1/auth/admin/update-user')
      .set('Cookie', admin.cookies)
      .send({ userId, data: { name: 'Renamed Created' } })
      .expect(200);

    expect(updated.body).toMatchObject({ name: 'Renamed Created' });

    const stored = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true },
    });
    expect(stored).toEqual({ name: 'Renamed Created' });
  });

  it('applies a DENY override before the admin plugin runs', async () => {
    const admin = await auth.setupAdmin();
    const target = await auth.registerAndLogin({
      email: 'blocked-target@test.com',
      password: 'Password123!',
      name: 'Blocked Target',
    });
    await authorization.assignUserPermissionOverride(
      admin.userId,
      'user:set-role',
      'DENY',
    );

    await request(app.getHttpServer())
      .post('/api/v1/auth/admin/set-role')
      .set('Cookie', admin.cookies)
      .send({ userId: target.userId, role: 'admin' })
      .expect(403);

    const targetUser = await prisma.user.findUniqueOrThrow({
      where: { id: target.userId },
      select: { role: true },
    });
    expect(targetUser.role).toBe('user');
  });

  it('cannot bypass a set-role DENY through admin/update-user', async () => {
    const admin = await auth.setupAdmin();
    const target = await auth.registerAndLogin({
      email: 'update-target@test.com',
      password: 'Password123!',
      name: 'Update Target',
    });
    await authorization.assignUserPermissionOverride(
      admin.userId,
      'user:set-role',
      'DENY',
    );

    await request(app.getHttpServer())
      .post('/api/v1/auth/admin/update-user')
      .set('Cookie', admin.cookies)
      .send({ userId: target.userId, data: { role: 'admin' } })
      .expect(403);

    const targetUser = await prisma.user.findUniqueOrThrow({
      where: { id: target.userId },
      select: { role: true },
    });
    expect(targetUser.role).toBe('user');
  });
});
