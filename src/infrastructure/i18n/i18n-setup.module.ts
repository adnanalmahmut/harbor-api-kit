import { buildI18nFallbacks, SUPPORTED_LOCALES } from '#src/common/locales.js';
import { appConfig, i18nConfig } from '#src/config/index.js';
import { Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import {
  AcceptLanguageResolver,
  I18nModule as NestI18nModule,
  QueryResolver,
} from 'nestjs-i18n';
import * as path from 'node:path';
import { ConfigLocaleResolver } from './config-locale.resolver.js';

function resolveLocalesPath() {
  return path.join(process.cwd(), 'locales');
}

@Module({
  imports: [
    NestI18nModule.forRootAsync({
      inject: [appConfig.KEY, i18nConfig.KEY],
      useFactory: (
        app: ConfigType<typeof appConfig>,
        i18n: ConfigType<typeof i18nConfig>,
      ) => ({
        fallbackLanguage: i18n.defaultLocale,
        fallbacks: buildI18nFallbacks(SUPPORTED_LOCALES),
        loaderOptions: {
          path: resolveLocalesPath(),
          watch: !app.isProduction,
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
