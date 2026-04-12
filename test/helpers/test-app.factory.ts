import { AppModule } from '#src/app.module.js';
import { configureApp } from '#src/core/app.bootstrap.js';
import {
  AppConfigService,
  PrismaService,
  RedisService,
} from '#src/core/index.js';
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
    if (app) {
      await app.close();
    }
  }
}
