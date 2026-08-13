import { PrismaService } from '#src/persistence/prisma/prisma.service.js';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';

export type NativeSignUpInput = {
  email: string;
  password: string;
  name: string;
  confirmPassword?: string;
};

export class AuthHelper {
  private requestSequence = 1;

  constructor(private readonly app: NestFastifyApplication) {}

  async registerAndLogin(
    input: NativeSignUpInput,
  ): Promise<{ cookies: string[]; userId: string }> {
    const forwardedFor = this.nextTestIp();
    const signUp = await request(this.app.getHttpServer())
      .post('/api/v1/auth/sign-up/email')
      .set('X-Forwarded-For', forwardedFor)
      .send({
        email: input.email,
        password: input.password,
        name: input.name,
      })
      .expect(200);

    const prisma = this.app.get(PrismaService);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: input.email },
      select: { id: true },
    });

    return { cookies: signUp.get('Set-Cookie') || [], userId: user.id };
  }

  /**
   * A fresh session, and therefore a fresh snapshot of the user.
   *
   * Needed whenever a test writes user state straight into the database after
   * signing in: Better Auth reads the session from Redis and never re-reads the
   * row, so the write is invisible to the session that predates it.
   */
  async signIn(email: string, password: string): Promise<string[]> {
    const response = await request(this.app.getHttpServer())
      .post('/api/v1/auth/sign-in/email')
      .set('X-Forwarded-For', this.nextTestIp())
      .send({ email, password })
      .expect(200);

    return response.get('Set-Cookie') || [];
  }

  /**
   * Signs in *after* the promotion, deliberately.
   *
   * A session carries a snapshot of the user, and Better Auth reads that
   * snapshot from Redis rather than re-reading the row on every request. A role
   * written straight into the database — as this helper does, and as no
   * production path does — therefore never reaches a session opened before the
   * write. Promoting through `/admin/set-role` does reach it, because that
   * route revokes the affected sessions.
   */
  async setupAdmin(): Promise<{
    userId: string;
    cookies: string[];
    roleId: string;
  }> {
    const email = 'superadmin@test.com';
    const password = 'Password123!';

    const result = await this.registerAndLogin({
      email,
      password,
      name: 'Super Admin',
    });

    const prisma = this.app.get(PrismaService);
    await prisma.user.update({
      where: { id: result.userId },
      data: { role: 'admin' },
    });

    return {
      userId: result.userId,
      cookies: await this.signIn(email, password),
      roleId: 'admin',
    };
  }

  private nextTestIp(): string {
    const value = this.requestSequence++;
    return `198.51.${Math.floor(value / 250)}.${(value % 250) + 1}`;
  }
}
