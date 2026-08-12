import appConfig from './app.config.js';
import authConfig from './auth.config.js';
import databaseConfig from './database.config.js';
import httpConfig from './http.config.js';
import i18nConfig from './i18n.config.js';
import loggerConfig from './logger.config.js';
import notificationConfig from './notification.config.js';
import redisConfig from './redis.config.js';
import storageConfig from './storage.config.js';
import tenantConfig from './tenant.config.js';

export const configurations = [
  appConfig,
  authConfig,
  databaseConfig,
  httpConfig,
  i18nConfig,
  loggerConfig,
  notificationConfig,
  redisConfig,
  storageConfig,
  tenantConfig,
];
