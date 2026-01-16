import { AppConfigModule } from '#src/infrastructure/config/app-config.module.js';
import { AppConfigService } from '#src/infrastructure/config/app-config.service.js';
import { Module } from '@nestjs/common';
import {
  AcceptLanguageResolver,
  I18nModule as NestI18nModule,
} from 'nestjs-i18n';
import * as path from 'node:path';
import { ConfigLocaleResolver } from './config-locale.resolver.js';

function resolveLocalesPath() {
  return path.join(process.cwd(), 'locales');
}

@Module({
  imports: [
    NestI18nModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        fallbackLanguage: config.i18n().defaultLocale,
        loaderOptions: {
          path: resolveLocalesPath(),
          watch: !config.isProd(),
        },
      }),
      resolvers: [
        ConfigLocaleResolver,
        { use: AcceptLanguageResolver, options: { matchType: 'strict-loose' } },
      ],
    }),
  ],
  exports: [NestI18nModule],
})
export class I18nSetupModule {}
