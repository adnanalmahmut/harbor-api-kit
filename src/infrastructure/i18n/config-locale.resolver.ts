import { AppConfigService } from '#src/infrastructure/config/app-config.service.js';
import { Injectable, type ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { type I18nResolver } from 'nestjs-i18n';
import { resolveLocaleFromSource } from './i18n-helpers.js';

@Injectable()
export class ConfigLocaleResolver implements I18nResolver {
  constructor(private readonly config: AppConfigService) {}

  resolve(context: ExecutionContext): string | undefined {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const i18nCfg = this.config.i18n();

    return resolveLocaleFromSource(
      { headers: req.headers, query: req.query as Record<string, unknown> },
      i18nCfg.headerName,
      i18nCfg.queryName,
    );
  }
}
