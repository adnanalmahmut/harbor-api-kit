import { parseAppConfig } from './app.config.js';
import { parseAuthConfig } from './auth.config.js';
import { parseHttpConfig } from './http.config.js';
import { parseStorageConfig } from './storage.config.js';

describe('namespaced configuration', () => {
  const base = {
    APP_PUBLIC_URL: 'http://localhost:5000',
    FRONTEND_PUBLIC_URL: 'http://localhost:3000',
    BETTER_AUTH_SECRET: 'a'.repeat(32),
    BETTER_AUTH_URL: 'http://localhost:5000',
  };

  it('parses and coerces application values', () => {
    expect(parseAppConfig({ ...base, APP_PORT: '4100' })).toMatchObject({
      name: 'API',
      env: 'development',
      port: 4100,
      isProduction: false,
    });
  });

  it('normalizes HTTP lists, booleans, and header names', () => {
    expect(
      parseHttpConfig({
        WEB_ALLOWED_ORIGINS: 'https://one.example,https://one.example',
        REDIRECT_ALLOWED_ORIGINS: 'https://two.example',
        ENABLE_DOCS: 'true',
        REQUEST_ID_HEADER_NAME: 'X-Request-ID',
      }),
    ).toMatchObject({
      docs: { enabled: true },
      requestId: { headerName: 'x-request-id' },
      cors: { originAllowlist: ['https://one.example'] },
      redirects: { originAllowlist: ['https://two.example'] },
    });
  });

  it('enforces production HTTPS and proxy constraints', () => {
    expect(() => parseAppConfig({ ...base, APP_ENV: 'production' })).toThrow();

    expect(() =>
      parseHttpConfig({
        APP_ENV: 'production',
        WEB_ALLOWED_ORIGINS: 'https://app.example.com',
        FASTIFY_TRUST_PROXY: 'true',
      }),
    ).toThrow();
  });

  it('rejects a cookie domain when any production cookie is host-only', () => {
    expect(() =>
      parseHttpConfig({
        APP_ENV: 'production',
        WEB_ALLOWED_ORIGINS: 'https://app.example.com',
        COOKIE_ALLOWED_DOMAINS: 'example.com',
        COOKIE_CSRF_NAME: 'csrf',
      }),
    ).toThrow();
  });

  it('enforces the session lifetime invariant', () => {
    expect(() =>
      parseAuthConfig({
        ...base,
        AUTH_SESSION_PERSISTENT_EXPIRES_IN_SEC: '60',
        AUTH_SESSION_ROLLING_UPDATE_AGE_SEC: '60',
      }),
    ).toThrow();
  });

  it('requires S3-compatible credentials for remote storage', () => {
    expect(() => parseStorageConfig({ STORAGE_DRIVER: 'r2' })).toThrow();
    expect(parseStorageConfig({ STORAGE_DRIVER: 'local' })).toEqual({
      driver: 'local',
      s3: {},
      local: { path: './uploads' },
    });
  });
});
