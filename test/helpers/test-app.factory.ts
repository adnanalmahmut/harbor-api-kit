import { AppModule } from '#src/app.module.js';
import { appConfig } from '#src/config/index.js';
import { configureApp } from '#src/bootstrap.js';
import { RedisService } from '#src/infrastructure/cache/redis.service.js';
import { PrismaService } from '#src/persistence/prisma/prisma.service.js';
import type { ConfigType } from '@nestjs/config';
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
    config: ConfigType<typeof appConfig>;
    redis: RedisService;
  }> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // Reuse the same configuration as the production app
    const config = await configureApp(app);
    const prisma = app.get(PrismaService);
    const redis = app.get(RedisService);

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    return { app, module: moduleFixture, prisma, config, redis };
  }

  static async teardown(app: NestFastifyApplication): Promise<void> {
    if (app) {
      await app.close();
    }
  }
}
