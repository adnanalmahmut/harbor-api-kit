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

  async setupAdmin(): Promise<{
    userId: string;
    cookies: string[];
    roleId: string;
  }> {
    const result = await this.registerAndLogin({
      email: 'superadmin@test.com',
      password: 'Password123!',
      name: 'Super Admin',
    });
    const prisma = this.app.get(PrismaService);
    await prisma.user.update({
      where: { id: result.userId },
      data: { role: 'admin' },
    });

    return { ...result, roleId: 'admin' };
  }

  private nextTestIp(): string {
    const value = this.requestSequence++;
    return `198.51.${Math.floor(value / 250)}.${(value % 250) + 1}`;
  }
}
