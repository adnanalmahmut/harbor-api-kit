import type { appConfig, httpConfig } from '#src/config/index.js';
import type { ConfigType } from '@nestjs/config';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

type BetterAuthOpenApiDocument = {
  openapi: string;
  paths: Record<string, unknown>;
  servers: Array<{ url: string }>;
  components?: {
    schemas?: Record<string, unknown>;
    securitySchemes?: Record<string, unknown>;
    [key: string]: unknown;
  };
  tags?: Array<{ name: string; description?: string }>;
};

export type BetterAuthOpenApiProvider = {
  api: {
    generateOpenAPISchema(): Promise<BetterAuthOpenApiDocument>;
  };
};

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

export async function setupApiDocs(
  app: NestFastifyApplication,
  appConfigValue: ConfigType<typeof appConfig>,
  http: ConfigType<typeof httpConfig>,
  auth: BetterAuthOpenApiProvider,
  transformAuthDocument: (
    document: BetterAuthOpenApiDocument,
  ) => BetterAuthOpenApiDocument = (document) => document,
): Promise<void> {
  if (!http.docs.enabled) return;

  const csrfCookieName = http.csrf.cookieName;
  const csrfHeaderName = http.csrf.headerName;

  const docConfig = new DocumentBuilder()
    .setTitle(appConfigValue.name)
    .setDescription(
      `## API Reference
This API build for ${appConfigValue.name} application`,
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

  const nestDocument = SwaggerModule.createDocument(app, docConfig, {
    deepScanRoutes: true,
  });
  const authDocument = transformAuthDocument(
    await auth.api.generateOpenAPISchema(),
  );
  const authServer = authDocument.servers.at(0);

  if (!authServer) {
    throw new Error('Better Auth OpenAPI document has no server URL');
  }

  const authServerUrl = new URL(authServer.url);
  const authPaths = prefixPaths(authDocument.paths, authServerUrl.pathname);
  const openApiDocument = {
    ...nestDocument,
    openapi: '3.1.1',
    paths: {
      ...nestDocument.paths,
      ...authPaths,
    },
    components: {
      ...nestDocument.components,
      ...authDocument.components,
      schemas: {
        ...nestDocument.components?.schemas,
        ...authDocument.components?.schemas,
      },
      securitySchemes: {
        ...nestDocument.components?.securitySchemes,
        ...authDocument.components?.securitySchemes,
      },
    },
    tags: mergeTags(nestDocument.tags, authDocument.tags),
  };

  // اجعل السيرفر الظاهر في docs هو البروكسي الخاص بالتوثيق
  openApiDocument.servers = [
    {
      url: '/documentation-proxy',
      description: 'Documentation proxy',
    },
  ];

  const fastify = app.getHttpAdapter().getInstance();

  fastify.get('/documentation/openapi.json', (_req: any, reply: any) => {
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
  fastify.get('/documentation', (_req: any, reply: any) => {
    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(appConfigValue.name)} Docs</title>
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

export function prefixPaths<T>(
  paths: Record<string, T>,
  basePath: string,
): Record<string, T> {
  const normalizedBasePath = normalizePath(basePath);

  return Object.fromEntries(
    Object.entries(paths).map(([path, definition]) => {
      const normalizedPath = normalizePath(path);
      const alreadyPrefixed =
        normalizedBasePath === '/' ||
        normalizedPath === normalizedBasePath ||
        normalizedPath.startsWith(`${normalizedBasePath}/`);
      const fullPath = alreadyPrefixed
        ? normalizedPath
        : `${normalizedBasePath}${normalizedPath}`;

      return [fullPath, definition];
    }),
  );
}

function normalizePath(path: string): string {
  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`;
  const withoutTrailingSlash = withLeadingSlash.replace(/\/+$/, '');
  return withoutTrailingSlash || '/';
}

function mergeTags(
  nestTags: Array<{ name: string; description?: string }> | undefined,
  authTags: Array<{ name: string; description?: string }> | undefined,
): Array<{ name: string; description?: string }> {
  const tags = new Map<string, { name: string; description?: string }>();
  for (const tag of [...(nestTags ?? []), ...(authTags ?? [])]) {
    if (!tags.has(tag.name)) tags.set(tag.name, tag);
  }
  return [...tags.values()];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
