import { AppConfigService } from '#src/core/index.js';
import type { IStorageDriver } from '#src/modules/files/application/ports/storage-driver.port.js';
import { FILES_TOKENS } from '#src/modules/files/files.tokens.js';
import { GCSDriver } from '#src/modules/files/infrastructure/drivers/gcs.driver.js';
import { LocalDriver } from '#src/modules/files/infrastructure/drivers/local.driver.js';
import { S3Driver } from '#src/modules/files/infrastructure/drivers/s3.driver.js';
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
