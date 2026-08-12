import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configurations } from './configurations.js';

const envFilePath = process.env.APP_ENV === 'test' ? '.env.test' : '.env';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath,
      load: configurations,
    }),
  ],
})
export class ConfigurationModule {}
