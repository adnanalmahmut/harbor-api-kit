import { storageConfig } from '#src/config/index.js';
import { AuthModule } from '#src/modules/auth/auth.module.js';
import { AuthorizationModule } from '#src/modules/authorization/authorization.module.js';
import { Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { FilesController } from './files.controller.js';
import { FilesService } from './files.service.js';
import { PublicFilesController } from './public-files.controller.js';
import { FileSignatureValidator } from './storage/file-signature.validator.js';
import { LocalDriver } from './storage/local.driver.js';
import { S3Driver } from './storage/s3.driver.js';
import {
  FileValidatorPort,
  StorageDriverPort,
} from './storage/storage.port.js';

// `FileRepository` is provided globally by PersistenceModule.
@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [FilesController, PublicFilesController],
  providers: [
    FilesService,
    LocalDriver,
    S3Driver,
    FileSignatureValidator,
    { provide: FileValidatorPort, useExisting: FileSignatureValidator },
    {
      // Which driver serves `StorageDriverPort` is configuration, and picking
      // it is module wiring — the same shape as the BETTER_AUTH factory in
      // auth.module.ts. It does not need a file of its own.
      provide: StorageDriverPort,
      useFactory: (
        config: ConfigType<typeof storageConfig>,
        local: LocalDriver,
        s3: S3Driver,
      ) => (config.driver === 'local' ? local : s3),
      inject: [storageConfig.KEY, LocalDriver, S3Driver],
    },
  ],
  exports: [FilesService],
})
export class FilesModule {}
