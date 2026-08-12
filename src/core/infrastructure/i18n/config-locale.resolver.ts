import { i18nConfig } from '#src/config/index.js';
import { resolveLocaleFromSource } from '#src/core/domain/index.js';
import { Inject, Injectable, type ExecutionContext } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { FastifyRequest } from 'fastify';
import { type I18nResolver } from 'nestjs-i18n';

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
