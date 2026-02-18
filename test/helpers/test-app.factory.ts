import { AppModule } from '#src/app.module.js';
import type { AppConfigService } from '#src/core/infrastructure/config/app-config.service.js';
import { PrismaService } from '#src/core/infrastructure/db/prisma/prisma.service.js';
import { configureApp } from '#src/core/app.bootstrap.js';
import { RedisService } from '#src/core/infrastructure/redis/redis.service.js';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test, type TestingModule } from '@nestjs/testing';

export class TestAppFactory {
  static async create(): Promise<{
    app: NestFastifyApplication;
    module: TestingModule;
    prisma: PrismaService;
    config: AppConfigService;
    redis: RedisService;
  }> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // Reuse the same configuration as the production app
    const config = configureApp(app);
    const prisma = app.get(PrismaService);
    const redis = app.get(RedisService);

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    return { app, module: moduleFixture, prisma, config, redis };
  }

  static async teardown(app: NestFastifyApplication): Promise<void> {
    await app.close();
  }
}
