import { AppConfigService } from '#src/core/infrastructure/index.js';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

function getCookieValue(
  cookieHeader: string | undefined,
  name: string,
): string | null {
  if (!cookieHeader) return null;

  const cookiePart = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  if (!cookiePart) return null;

  const value = cookiePart.slice(name.length + 1);
  return value ? decodeURIComponent(value) : null;
}

export function setupApiDocs(
  app: NestFastifyApplication,
  config: AppConfigService,
) {
  if (!config.docs().enabled) return;

  const appCfg = config.app();
  const csrfCfg = config.csrf();

  const csrfCookieName = csrfCfg.cookieName;
  const csrfHeaderName = String(csrfCfg.headerName).toLowerCase();

  const docConfig = new DocumentBuilder()
    .setTitle(appCfg.name)
    .setDescription(
      `## API Reference
This API build for ${appCfg.name} application`,
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
    .build();

  const openApiDocument = SwaggerModule.createDocument(app, docConfig);

  // اجعل السيرفر الظاهر في docs هو البروكسي الخاص بالتوثيق
  openApiDocument.servers = [
    {
      url: '/documentation-proxy',
      description: 'Documentation proxy',
    },
  ];

  const fastify = app.getHttpAdapter().getInstance();

  fastify.get('/documentation/openapi.json', async (_req: any, reply: any) => {
    reply.type('application/json').send(openApiDocument);
  });

  // بروكسي داخلي يضيف هيدر CSRF على مستوى السيرفر
  fastify.route({
    method: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    url: '/documentation-proxy/*',
    handler: async (req: any, reply: any) => {
      const rawUrl = String(req.raw.url || '/documentation-proxy');
      const [pathname, queryString] = rawUrl.split('?');

      const targetPath = pathname.replace(/^\/documentation-proxy/, '') || '/';
      const targetUrl = queryString
        ? `${targetPath}?${queryString}`
        : targetPath;

      const headers: Record<string, any> = { ...req.headers };

      delete headers.host;
      delete headers['content-length'];

      const csrfToken = getCookieValue(req.headers.cookie, csrfCookieName);
      if (csrfToken) {
        headers[csrfHeaderName] = csrfToken;
      }

      const injected = await fastify.inject({
        method: req.method,
        url: targetUrl,
        headers,
        payload: req.body,
      });

      reply.code(injected.statusCode);

      for (const [key, value] of Object.entries(injected.headers)) {
        if (value === undefined) continue;
        if (key.toLowerCase() === 'content-length') continue;
        reply.header(key, value as any);
      }

      return reply.send(injected.rawPayload);
    },
  });

  // صفحة docs مخصصة بدون onBeforeRequest وبدون fetch wrapper
  fastify.get('/documentation', async (_req: any, reply: any) => {
    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(appCfg.name)} Docs</title>
    <style>
      html, body, #app {
        width: 100%;
        height: 100%;
        margin: 0;
      }
    </style>
  </head>
  <body>
    <div id="app"></div>

    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.52.0"></script>
    <script>
      Scalar.createApiReference('#app', {
        url: '/documentation/openapi.json',
        theme: 'purple',
        darkMode: true,
        agent: { disabled: true },
        telemetry: false,
        showDeveloperTools: 'never',
      });
    </script>
  </body>
</html>`;

    reply.type('text/html').send(html);
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
