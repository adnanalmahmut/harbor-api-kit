import { appConfig, i18nConfig, SUPPORTED_LOCALES } from '#src/config/index.js';
import {
  Inject,
  Injectable,
  Module,
  type ExecutionContext,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { FastifyRequest } from 'fastify';
import {
  AcceptLanguageResolver,
  I18nModule as NestI18nModule,
  QueryResolver,
  type I18nResolver,
} from 'nestjs-i18n';
import * as path from 'node:path';
import { buildI18nFallbacks, resolveLocaleFromSource } from './i18n.utils.js';

/**
 * Resolves the locale from the header and query parameter named in
 * configuration, ahead of the stock resolvers below it.
 */
@Injectable()
export class ConfigLocaleResolver implements I18nResolver {
  constructor(
    @Inject(i18nConfig.KEY)
    private readonly config: ConfigType<typeof i18nConfig>,
  ) {}

  resolve(context: ExecutionContext): string | undefined {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    return resolveLocaleFromSource(
      { headers: req.headers, query: req.query as Record<string, unknown> },
      this.config.headerName,
      this.config.queryName,
      { includeAcceptLanguage: false },
    );
  }
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
          path: path.join(process.cwd(), 'locales'),
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
export class I18nModule {}
