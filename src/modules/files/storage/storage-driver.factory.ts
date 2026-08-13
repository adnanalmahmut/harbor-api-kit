import { storageConfig } from '#src/config/index.js';
import type { FactoryProvider } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { LocalDriver } from './local.driver.js';
import { S3Driver } from './s3.driver.js';
import { StorageDriverPort } from './storage.port.js';

export const StorageDriverProvider: FactoryProvider<StorageDriverPort> = {
  provide: StorageDriverPort,
  useFactory: (
    config: ConfigType<typeof storageConfig>,
    local: LocalDriver,
    s3: S3Driver,
  ) => {
    switch (config.driver) {
      case 's3':
      case 'r2':
      case 'spaces':
        return s3;
      case 'local':
      default:
        return local;
    }
  },
  inject: [storageConfig.KEY, LocalDriver, S3Driver],
};
