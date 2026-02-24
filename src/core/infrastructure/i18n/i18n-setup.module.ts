import {
  buildI18nFallbacks,
  SUPPORTED_LOCALES,
} from '#src/core/domain/index.js';
import { Module } from '@nestjs/common';
import {
  AcceptLanguageResolver,
  I18nModule as NestI18nModule,
  QueryResolver,
} from 'nestjs-i18n';
import * as path from 'node:path';
import { AppConfigModule } from '../config/app-config.module.js';
import { AppConfigService } from '../config/app-config.service.js';
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
        fallbacks: buildI18nFallbacks(SUPPORTED_LOCALES),
        loaderOptions: {
          path: resolveLocalesPath(),
          watch: !config.isProd(),
        },
      }),
      resolvers: [
        ConfigLocaleResolver,
        { use: QueryResolver, options: ['lang', 'locale'] },
        AcceptLanguageResolver,
      ],
    }),
  ],
  exports: [NestI18nModule],
})
export class I18nSetupModule {}
