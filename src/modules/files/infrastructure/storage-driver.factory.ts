import { storageConfig } from '#src/config/index.js';
import type { FactoryProvider } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { IStorageDriver } from '../application/index.js';
import { FILES_TOKENS } from '../files.tokens.js';
import { LocalDriver, S3Driver } from './index.js';

export const StorageDriverProvider: FactoryProvider<IStorageDriver> = {
  provide: FILES_TOKENS.STORAGE_DRIVER,
  useFactory: (
    config: ConfigType<typeof storageConfig>,
    local: LocalDriver,
    s3: S3Driver,
  ) => {
    const driver = config.driver;

    switch (driver) {
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
