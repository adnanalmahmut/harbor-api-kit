import {
  buildI18nFallbacks,
  SUPPORTED_LOCALES,
} from '#src/core/domain/constants/locales.js';
import { AppConfigModule } from '#src/core/infrastructure/config/app-config.module.js';
import { AppConfigService } from '#src/core/infrastructure/config/app-config.service.js';
import { ConfigLocaleResolver } from '#src/core/infrastructure/i18n/config-locale.resolver.js';
import { Module } from '@nestjs/common';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nModule as NestI18nModule,
  QueryResolver,
} from 'nestjs-i18n';
import * as path from 'node:path';

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
        { use: QueryResolver, options: ['lang', 'locale'] },
        AcceptLanguageResolver,
        new HeaderResolver(['x-lang']),
        ConfigLocaleResolver,
      ],
    }),
  ],
  exports: [NestI18nModule],
})
export class I18nSetupModule {}
