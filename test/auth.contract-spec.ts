import { PrismaService, RedisService } from '#src/core/index.js';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AuthHelper } from './helpers/auth.helper.js';
import { TestAppFactory } from './helpers/test-app.factory.js';
import { resetDb } from './helpers/test-db.helper.js';
import { clearRedisCache } from './helpers/test-redis.helper.js';

describe('Better Auth native routes (contract)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let auth: AuthHelper;

  beforeAll(async () => {
    const docsEnabled = process.env.ENABLE_DOCS;
    process.env.ENABLE_DOCS = 'true';
    try {
      const factory = await TestAppFactory.create();
      app = factory.app;
      prisma = factory.prisma;
      redis = factory.redis;
      auth = new AuthHelper(app);
    } finally {
      if (docsEnabled === undefined) delete process.env.ENABLE_DOCS;
      else process.env.ENABLE_DOCS = docsEnabled;
    }
  });

  afterAll(async () => TestAppFactory.teardown(app));

  beforeEach(async () => {
    await resetDb(prisma);
    await clearRedisCache(redis);
  });

  it('publishes Better Auth native routes with the configured base path', async () => {
    const response = await request(app.getHttpServer())
      .get('/documentation/openapi.json')
      .expect(200);
    const paths = response.body.paths as Record<string, unknown>;

    expect(response.body.openapi).toBe('3.1.1');
    expect(paths).toHaveProperty('/api/v1/auth/sign-in/email');
    expect(paths).toHaveProperty('/api/v1/auth/get-session');
    expect(paths).toHaveProperty('/api/v1/auth/admin/list-users');
    expect(paths).not.toHaveProperty('/sign-in/email');
    const signUpOperation = (paths['/api/v1/auth/sign-up/email'] as any).post;
    // The generated document is forwarded unmodified: `name` is Better Auth's
    // own user field and the application no longer rewrites the schema.
    const signUpSchema =
      signUpOperation.requestBody.content['application/json'].schema;
    expect(signUpSchema.properties).toHaveProperty('name');
    expect(signUpSchema.properties).not.toHaveProperty('firstName');
    expect(signUpSchema.required).toEqual(
      expect.arrayContaining(['email', 'password', 'name']),
    );
    expect(response.body.components.schemas.User.properties).toHaveProperty(
      'name',
    );
  });

  it('registers and signs in through Better Auth canonical paths', async () => {
    const signUp = await request(app.getHttpServer())
      .post('/api/v1/auth/sign-up/email')
      .send({
        email: 'native@test.com',
        password: 'Password123!',
        name: 'Native User',
      })
      .expect(200);

    expect(signUp.body.user.email).toBe('native@test.com');
    expect(signUp.body.user).toMatchObject({
      name: 'Native User',
      role: 'user',
    });
    const stored = await prisma.user.findUniqueOrThrow({
      where: { email: 'native@test.com' },
      select: { name: true },
    });
    expect(stored).toEqual({ name: 'Native User' });

    const signIn = await request(app.getHttpServer())
      .post('/api/v1/auth/sign-in/email')
      .send({ email: 'native@test.com', password: 'Password123!' })
      .expect(200);

    expect(signIn.body.user.email).toBe('native@test.com');
    expect(signIn.get('Set-Cookie')?.length).toBeGreaterThan(0);
  });

  it('returns the native session payload for an authenticated request', async () => {
    const { cookies, userId } = await auth.registerAndLogin({
      email: 'session@test.com',
      password: 'Password123!',
      name: 'Session User',
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/get-session')
      .set('Cookie', cookies)
      .expect(200);

    expect(response.body.user.id).toBe(userId);
    expect(response.body.user.name).toBe('Session User');
    expect(response.body.session.userId).toBe(userId);
    // Better Auth owns the payload shape: no `{ success, message, data }` envelope.
    expect(response.body.success).toBeUndefined();
  });

  it('updates the user name through the native route', async () => {
    const { cookies, userId } = await auth.registerAndLogin({
      email: 'rename@test.com',
      password: 'Password123!',
      name: 'Before Rename',
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/update-user')
      .set('Cookie', cookies)
      .send({ name: 'After Rename' })
      .expect(200);

    expect(response.body).toEqual({ status: true });

    const stored = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true },
    });
    expect(stored).toEqual({ name: 'After Rename' });
  });

  it('rejects invalid native sign-up input', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/sign-up/email')
      .send({ email: 'not-an-email' })
      .expect(400);
  });

  it('rejects sign-up without the required name field', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/sign-up/email')
      .send({
        email: 'missing-name@test.com',
        password: 'Password123!',
      })
      .expect(400);
  });

  it('rejects duplicate email registration', async () => {
    const payload = {
      email: 'duplicate@test.com',
      password: 'Password123!',
      name: 'Duplicate User',
    };
    await request(app.getHttpServer())
      .post('/api/v1/auth/sign-up/email')
      .send(payload)
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/auth/sign-up/email')
      .send(payload)
      .expect(422);
  });
});
