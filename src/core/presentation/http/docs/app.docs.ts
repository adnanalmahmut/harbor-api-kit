// src/core/presentation/http/docs/app.docs.ts
import type { AppConfigService } from '#src/core/infrastructure/config/app-config.service.js';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';

// Node-only TS (no DOM lib)
declare const window: any;

type ScalarFetch = (
  input: unknown,
  init?: Record<string, unknown>,
) => Promise<unknown>;
type ScalarOnBeforeRequest = (args: {
  request: { headers: { set: (name: string, value: string) => void } };
}) => void;

export function setupApiDocs(
  app: NestFastifyApplication,
  config: AppConfigService,
) {
  if (!config.app().enableDocs) return;

  const appCfg = config.app();

  const csrfCfg = config.csrf();
  const csrfCookieName = csrfCfg.cookieName;

  const csrfHeaderName = String(csrfCfg.headerName).toLowerCase();

  const docConfig = new DocumentBuilder()
    .setTitle(appCfg.name)
    .setDescription(
      `## API Reference
      This API bulid for ${appCfg.name} application
      
      `,
    )
    .setVersion('1.0')
    .addCookieAuth()
    .addGlobalParameters({
      name: 'Accept-Language',
      in: 'header',
      required: true,
      schema: { type: 'string', enum: ['ar-SY', 'en-US'] },
    })
    .addGlobalParameters({
      name: 'X-Forwarded-For',
      in: 'header',
      required: true,
      schema: { type: 'string', example: '192.29.224.220' },
    })
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: csrfHeaderName,
        description: 'CSRF token',
      },
      'csrf',
    )
    .build();

  const openApiDocument = SwaggerModule.createDocument(app, docConfig);

  const fetchWithCookies: ScalarFetch = (input, init) => {
    return window.fetch(input as any, {
      ...(init ?? {}),
      credentials: 'include',
    });
  };

  // Inject config values as literals INSIDE the serialized browser function
  const cookieNameLit = JSON.stringify(csrfCookieName);
  const headerNameLit = JSON.stringify(csrfHeaderName);

  const onBeforeRequest: ScalarOnBeforeRequest = new Function(`
    return ({ request }) => {
      const cookieName = ${cookieNameLit};
      const headerName = ${headerNameLit};

      const doc = window && window.document;
      if (!doc) return;

      const match = doc.cookie.match(new RegExp('(^| )' + cookieName + '=([^;]+)'));
      if (match) {
        request.headers.set(headerName, decodeURIComponent(match[2]));
      }
    };
  `)();

  app.use(
    '/documentation',
    apiReference({
      content: openApiDocument,
      pageTitle: `${appCfg.name} Docs`,
      theme: 'purple',
      darkMode: true,
      withFastify: true,
      fetch: fetchWithCookies,
      onBeforeRequest,
    } as any),
  );
}
