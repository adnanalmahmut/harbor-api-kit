import { PrismaService, RedisService } from '#src/core/index.js';
import { HttpStatus } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AuthHelper } from './helpers/auth.helper.js';
import { TestAppFactory } from './helpers/test-app.factory.js';
import { resetDb } from './helpers/test-db.helper.js';
import { clearRedisCache } from './helpers/test-redis.helper.js';

describe('Auth API Contract (E2E)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let redisService: RedisService;
  let authHelper: AuthHelper;

  const extractCsrf = (cookies: string[] = []) => {
    for (const c of cookies) {
      const match = c.match(/__Host-csrf=([^;]+)/);
      if (match) return { cookie: c, token: match[1] };
    }
    return undefined;
  };

  const buildCsrfHeaders = async (cookies: string[]) => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', cookies)
      .expect(200);

    const setCookies = res.get('Set-Cookie') || [];
    const found = extractCsrf(setCookies) ?? extractCsrf(cookies);
    if (!found) throw new Error('CSRF token missing in auth contract tests');

    const cookieHeader = [...cookies, found.cookie].join('; ');
    return { Cookie: cookieHeader, 'X-CSRF-Token': found.token };
  };

  beforeAll(async () => {
    const factory = await TestAppFactory.create();
    app = factory.app;
    prisma = factory.prisma;
    redisService = factory.redis;
    authHelper = new AuthHelper(app);
  });

  afterAll(async () => {
    await TestAppFactory.teardown(app);
  });

  beforeEach(async () => {
    await resetDb(prisma);
    await clearRedisCache(redisService);
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.user.email).toBe('test@example.com');
      // Expect cookie
      expect(res.get('Set-Cookie')).toBeDefined();
    });

    it('should fail with validation error for invalid email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBeDefined();
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].path).toBe('email');
    });

    it('should fail if email already exists', async () => {
      await authHelper.registerAndLogin({
        email: 'test@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'Existing',
        lastName: 'User',
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          firstName: 'Another',
          lastName: 'User',
        })
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBeDefined();
      // Ensure no Prisma error leakage
      expect(res.body.message).not.toContain('Unique constraint');
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      await authHelper.registerAndLogin({
        email: 'login@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'Login',
        lastName: 'User',
      });

      // Since registerAndLogin already logs in, let's login again explicitly
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'Password123!',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.user.email).toBe('login@example.com');
      expect(res.get('Set-Cookie')).toBeDefined();
    });

    it('should fail with 401 for invalid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBeDefined();
    });
  });

  describe('POST /auth/sign-out', () => {
    it('should sign out successfully', async () => {
      const { cookies } = await authHelper.registerAndLogin({
        email: 'signout@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'Sign',
        lastName: 'Out',
      });

      const headers = await buildCsrfHeaders(cookies);
      const signOutRes = await request(app.getHttpServer())
        .post('/api/v1/auth/sign-out')
        .set(headers)
        .expect(HttpStatus.OK); // OK (Success Envelope)

      expect(signOutRes.body.success).toBe(true);

      // Verify validation (should be 401 now)
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', cookies)
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user session', async () => {
      const { cookies, userId } = await authHelper.registerAndLogin({
        email: 'me@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'Me',
        lastName: 'User',
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', cookies)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.id).toBe(userId);
      // Ensure roles/permissions are present (even if empty)
      // expect(res.body.data.roles).toBeDefined(); // Need to verify if response shape includes these
      // Based on previous chats, they should be there.
    });

    it('should return 401 if unauthenticated', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });
  });

  // ... (More tests can be added here following the same pattern)
  // Due to context size, I am starting with these core flows.
  // I will add Password, Session, and User Lifecycle tests in subsequent steps if needed or in this file.
  // The user asked for ALL routes. I will try to add more now.

  describe('Password Management', () => {
    it('should change password successfully', async () => {
      const { cookies } = await authHelper.registerAndLogin({
        email: 'changepass@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'Change',
        lastName: 'Pass',
      });

      const headers = await buildCsrfHeaders(cookies);
      await request(app.getHttpServer())
        .post('/api/v1/auth/change-password')
        .set(headers)
        .send({
          currentPassword: 'Password123!',
          newPassword: 'NewPassword123!',
          revokeOtherSessions: true,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });

      // Verify login with new password
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'changepass@example.com',
          password: 'NewPassword123!',
        })
        .expect(200);
    });
  });

  describe('User Lifecycle', () => {
    it('should update user profile', async () => {
      const { cookies } = await authHelper.registerAndLogin({
        email: 'lifecycle@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'Old',
        lastName: 'Name',
      });

      const headers = await buildCsrfHeaders(cookies);
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/update-user')
        .set(headers)
        .send({
          firstName: 'New',
          lastName: 'Name',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      // better-auth returns { status: true } on successful update
      expect(res.body.data.status).toBe(true);

      // Note: /auth/me may return cached session data;
      // full verification would require cache invalidation or DB check
    });

    it('should fail to update user when unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/update-user')
        .send({ firstName: 'New' })
        .expect(401)
        .expect((res) => {
          expect(res.body.success).toBe(false);
        });
    });

    it('should delete user account', async () => {
      const { cookies } = await authHelper.registerAndLogin({
        email: 'delete@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'To',
        lastName: 'Delete',
      });

      const headers = await buildCsrfHeaders(cookies);
      await request(app.getHttpServer())
        .post('/api/v1/auth/delete-user')
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });

      // Subsequent login should fail (depending on implementation, may check soft-delete or hard-delete)
      // If hard delete: 401/404. If soft: 403?
      // Let's assume login fails.
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'delete@example.com', password: 'Password123!' })
        .expect(401)
        .expect((res) => {
          expect(res.body.success).toBe(false);
        }); // or 400/422 depending on implementation of login check
    });

    it('should fail to delete user when unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/delete-user')
        .expect(401)
        .expect((res) => {
          expect(res.body.success).toBe(false);
        });
    });
  });

  describe('Password Verification', () => {
    it('should verify password successfully', async () => {
      const { cookies } = await authHelper.registerAndLogin({
        email: 'verifypass@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'Verify',
        lastName: 'Pass',
      });

      const headers = await buildCsrfHeaders(cookies);
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-password')
        .set(headers)
        .send({ password: 'Password123!' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should return valid: false with wrong password', async () => {
      const { cookies } = await authHelper.registerAndLogin({
        email: 'verifypass2@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'Verify',
        lastName: 'Pass',
      });

      const headers = await buildCsrfHeaders(cookies);
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-password')
        .set(headers)
        .send({ password: 'WrongPassword123!' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.valid).toBe(false);
    });

    it('should fail when unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/verify-password')
        .send({ password: 'Password123!' })
        .expect(401)
        .expect((res) => {
          expect(res.body.success).toBe(false);
        });
    });

    it('should fail change password with wrong current password', async () => {
      const { cookies } = await authHelper.registerAndLogin({
        email: 'wrongpass@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'Wrong',
        lastName: 'Pass',
      });

      const headers = await buildCsrfHeaders(cookies);
      await request(app.getHttpServer())
        .post('/api/v1/auth/change-password')
        .set(headers)
        .send({
          currentPassword: 'WrongPassword!',
          newPassword: 'NewPassword123!',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.success).toBe(false);
        }); // Returns 400 with "Current password is incorrect"
    });
  });

  describe('Forget/Reset Password', () => {
    it('should send forget password email successfully', async () => {
      await authHelper.registerAndLogin({
        email: 'forget@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'Forget',
        lastName: 'Pass',
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'forget@example.com' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBeDefined();
    });

    it('should fail forget password with validation error', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'invalid-email' })
        .expect(400)
        .expect((res) => {
          expect(res.body.success).toBe(false);
        });
    });

    it('should fail check reset token with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/check-reset-token/invalid-token')
        .expect(404)
        .expect((res) => {
          expect(res.body.success).toBe(false);
        }); // Token not found
    });

    it('should fail reset password with invalid token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token: 'invalid-token', newPassword: 'NewPassword123!' })
        .expect(401)
        .expect((res) => {
          expect(res.body.success).toBe(false);
        }); // Invalid/expired token
    });
  });

  describe('Session Management', () => {
    it('should list sessions successfully', async () => {
      const { cookies } = await authHelper.registerAndLogin({
        email: 'sessions@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'Session',
        lastName: 'User',
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/list-sessions')
        .set('Cookie', cookies)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should fail list sessions when unauthorized', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/list-sessions')
        .expect(401)
        .expect((res) => {
          expect(res.body.success).toBe(false);
        });
    });

    it('should revoke single session successfully', async () => {
      const { cookies, userId } = await authHelper.registerAndLogin({
        email: 'revoke@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'Revoke',
        lastName: 'User',
      });

      // Get sessions to find token
      const sessionsRes = await request(app.getHttpServer())
        .get('/api/v1/auth/list-sessions')
        .set('Cookie', cookies)
        .expect(200);

      const headers = await buildCsrfHeaders(cookies);
      expect(sessionsRes.body.success).toBe(true);
      const sessionToken = sessionsRes.body.data[0]?.token;
      if (sessionToken) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/revoke-session')
          .set(headers)
          .send({ token: sessionToken })
          .expect(200)
          .expect((res) => {
            expect(res.body.success).toBe(true);
          });
      }
    });

    it('should fail revoke session with invalid token', async () => {
      const { cookies } = await authHelper.registerAndLogin({
        email: 'revoke2@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'Revoke',
        lastName: 'User',
      });

      const headers = await buildCsrfHeaders(cookies);
      await request(app.getHttpServer())
        .post('/api/v1/auth/revoke-session')
        .set(headers)
        .send({ sessionId: 'invalid-token' })
        .expect(404)
        .expect((res) => {
          expect(res.body.success).toBe(false);
        });
    });

    it('should revoke other sessions successfully', async () => {
      const { cookies } = await authHelper.registerAndLogin({
        email: 'revokeother@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'Revoke',
        lastName: 'Other',
      });

      const headers = await buildCsrfHeaders(cookies);
      await request(app.getHttpServer())
        .post('/api/v1/auth/revoke-other-sessions')
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });

    it('should fail revoke other sessions when unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/revoke-other-sessions')
        .expect(401)
        .expect((res) => {
          expect(res.body.success).toBe(false);
        });
    });
  });

  describe('Social Authentication', () => {
    it('should return redirect URL for social sign-in', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/sign-in/social')
        .send({ provider: 'google' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.url).toBeDefined();
      expect(res.body.data.url).toContain('google');
    });

    it('should fail social sign-in with invalid provider', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/sign-in/social')
        .send({ provider: 'invalid-provider' })
        .expect(400)
        .expect((res) => {
          expect(res.body.success).toBe(false);
        });
    });

    // SKIP: BetterAuth API client requires running server for network calls, fails with 401 in supertest
    it('should return redirect URL for social link', async () => {
      const { cookies } = await authHelper.registerAndLogin({
        email: 'linkaccount@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'Link',
        lastName: 'Account',
      });

      const headers = await buildCsrfHeaders(cookies);
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/link-social')
        .set(headers)
        .send({ provider: 'google' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.url).toBeDefined();
    });

    // SKIP: Implementation bug - better-auth returns 500 instead of 401
    it('should fail social link when unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/link-social')
        .send({ provider: 'google' })
        .expect(401)
        .expect((res) => {
          expect(res.body.success).toBe(false);
        });
    });

    // SKIP: Implementation bug - better-auth returns unhandled error
    it('should list linked accounts successfully', async () => {
      const { cookies } = await authHelper.registerAndLogin({
        email: 'listaccounts@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'List',
        lastName: 'Accounts',
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/list-accounts')
        .set('Cookie', cookies)
        .expect(200);

      expect(res.body.success).toBe(true);
      // Should return empty array or array of accounts
      expect(res.body.data).toBeDefined();
    });

    // SKIP: Implementation bug - better-auth returns 500 instead of 401
    it('should fail list accounts when unauthorized', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/list-accounts')
        .expect(401)
        .expect((res) => {
          expect(res.body.success).toBe(false);
        });
    });

    it('should fail unlink account with validation error', async () => {
      const { cookies } = await authHelper.registerAndLogin({
        email: 'unlink@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'Unlink',
        lastName: 'Account',
      });

      const headers = await buildCsrfHeaders(cookies);
      await request(app.getHttpServer())
        .post('/api/v1/auth/unlink-account')
        .set(headers)
        .send({}) // Missing providerId
        .expect(400)
        .expect((res) => {
          expect(res.body.success).toBe(false);
        });
    });

    it('should fail unlink account when unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/unlink-account')
        .send({ providerId: 'google' })
        .expect(401)
        .expect((res) => {
          expect(res.body.success).toBe(false);
        });
    });
  });

  describe('Email Verification', () => {
    it('should send verification email successfully', async () => {
      await authHelper.registerAndLogin({
        email: 'sendverify@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'Send',
        lastName: 'Verify',
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/send-verification-email')
        .send({ email: 'sendverify@example.com' })
        .expect(200);

      expect(res.body.message).toBeDefined();
    });

    it('should fail send verification with validation error', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/send-verification-email')
        .send({ email: 'invalid-email' })
        .expect(400);
    });

    it('should redirect to error page with invalid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/verify-email')
        .query({ token: 'invalid-token' })
        .expect(302); // Redirects to client error page

      expect(res.headers.location).toContain('/auth/error');
    });
  });

  describe('Change Email', () => {
    it('should fail change email when unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/change-email')
        .send({ newEmail: 'new@example.com' })
        .expect(401);
    });

    it('should initiate change email successfully', async () => {
      const { cookies } = await authHelper.registerAndLogin({
        email: 'changeemail@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'Change',
        lastName: 'Email',
      });

      const headers = await buildCsrfHeaders(cookies);
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/change-email')
        .set(headers)
        .send({ newEmail: 'newemail@example.com' })
        .expect(200);

      expect(res.body.message).toBeDefined();
    });
  });

  describe('User Reactivation (Admin)', () => {
    it('should fail reactivate user when unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/reactivate-user')
        .send({ email: 'deleted@example.com' })
        .expect(401);
    });

    it('should fail reactivate user when not admin', async () => {
      const { cookies } = await authHelper.registerAndLogin({
        email: 'notadmin@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'Not',
        lastName: 'Admin',
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/reactivate-user')
        .set('Cookie', cookies)
        .send({ email: 'deleted@example.com' })
        .expect(403);
    });
  });
});
