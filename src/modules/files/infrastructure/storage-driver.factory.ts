import { AppConfigService } from '#src/core/index.js';
import type { IStorageDriver } from '../application/index.js';
import { FILES_TOKENS } from '../files.tokens.js';
import { GCSDriver, LocalDriver, S3Driver } from './index.js';
import type { FactoryProvider } from '@nestjs/common';

export const StorageDriverProvider: FactoryProvider<IStorageDriver> = {
  provide: FILES_TOKENS.STORAGE_DRIVER,
  useFactory: (
    configService: AppConfigService,
    local: LocalDriver,
    s3: S3Driver,
    gcs: GCSDriver,
  ) => {
    const driver = configService.storage().driver;

    switch (driver) {
      case 's3':
      case 'r2':
      case 'spaces':
        return s3;
      case 'gcs':
        return gcs;
      case 'local':
      default:
        return local;
    }
  },
  inject: [AppConfigService, LocalDriver, S3Driver, GCSDriver],
};
