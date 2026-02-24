import { PrismaService } from '#src/core/index.js';
import { RegisterDto } from '#src/modules/auth/index.js';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';

export class AuthHelper {
  constructor(private readonly app: NestFastifyApplication) {}

  async registerAndLogin(
    dto: RegisterDto,
  ): Promise<{ cookies: string[]; userId: string; token?: string }> {
    await request(this.app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(dto)
      .expect(201);

    const prisma = this.app.get(PrismaService);
    await prisma.user.update({
      where: { email: dto.email },
      data: { emailVerified: true },
    });

    const loginRes = await request(this.app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: dto.email, password: dto.password })
      .expect(200);

    const cookies = loginRes.get('Set-Cookie') || [];
    // If we use tokens in body
    const token = loginRes.body.data?.accessToken;

    const meRes = await request(this.app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', cookies)
      .set('Authorization', token ? `Bearer ${token}` : '')
      .expect(200);

    return { cookies, userId: meRes.body.data.user.id, token };
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ cookies: string[]; token?: string }> {
    const loginRes = await request(this.app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    return {
      cookies: loginRes.get('Set-Cookie') || [],
      token: loginRes.body.data?.accessToken,
    };
  }

  async setupAdmin(
    rbacHelper: any,
  ): Promise<{ userId: string; cookies: string[]; roleId: string }> {
    // 1. Register Admin
    const { userId, cookies } = await this.registerAndLogin({
      email: 'superadmin@test.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      firstName: 'Super',
      lastName: 'Admin',
    });

    // 2. Create Admin Role
    const roleId = await rbacHelper.createRole('Admin', 'admin');

    // 3. Assign Role
    await rbacHelper.assignRoleToUser(userId, roleId);

    // 4. Create & Assign Permissions (Wildcard or specific based on app logic)
    // For coverage, we verify specific permissions usage
    // We can assume the test might need to add more permissions, so we leave basic setup here
    // or we add all common ones.
    const permissions = [
      ['roles', 'create'],
      ['roles', 'read'],
      ['roles', 'update'],
      ['roles', 'delete'],
      ['permissions', 'create'],
      ['permissions', 'read'],
      ['permissions', 'update'],
      ['permissions', 'delete'],
      ['users', 'read'],
      ['users', 'create'],
      ['users', 'update'],
      ['users', 'delete'],
      ['files', 'create'],
      ['files', 'read'],
      ['files', 'update'],
      ['files', 'delete'],
      ['files', 'download'],
    ];

    for (const [subject, action] of permissions) {
      // Create if not exists (helper might need check, but resetDb handles cleanup)
      // Ignoring promise.all for sequence safety in tests
      const pId = await rbacHelper.createPermission(subject, action);
      await rbacHelper.assignPermissionToRole(roleId, pId);
    }

    return { userId, cookies, roleId };
  }
}
