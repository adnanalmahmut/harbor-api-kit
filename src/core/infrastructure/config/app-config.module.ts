import { AppConfigService } from '#src/core/infrastructure/config/app-config.service.js';
import { validateEnv } from '#src/core/infrastructure/config/env.schema.js';
import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
      envFilePath: process.env.APP_ENV === 'test' ? '.env.test' : '.env',
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
