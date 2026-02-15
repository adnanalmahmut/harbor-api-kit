import { AppConfigModule } from '#src/core/infrastructure/config/app-config.module.js';
import { AppConfigService } from '#src/core/infrastructure/config/app-config.service.js';
import { PrismaModule } from '#src/core/infrastructure/db/prisma/prisma.module.js';
import { AuthModule } from '#src/modules/auth/auth.module.js';
import type { IFileRepository } from '#src/modules/files/application/ports/file.repository.port.js';
import type { IStorageDriver } from '#src/modules/files/application/ports/storage-driver.port.js';
import { FILES_TOKENS } from '#src/modules/files/files.tokens.js';
import { StorageDriverProvider } from '#src/modules/files/infrastructure/adapters/storage-driver.factory.js';
import { GCSDriver } from '#src/modules/files/infrastructure/drivers/gcs.driver.js';
import { LocalDriver } from '#src/modules/files/infrastructure/drivers/local.driver.js';
import { S3Driver } from '#src/modules/files/infrastructure/drivers/s3.driver.js';
import { PrismaFileRepository } from '#src/modules/files/infrastructure/repositories/prisma-file.repository.js';
import { PublicFilesController } from '#src/modules/files/presentation/http/public-files.controller.js';
import { Module } from '@nestjs/common';
import { GetDownloadUrlUseCase } from './application/use-cases/get-download-url.use-case.js';

import { FileSignatureValidator } from '#src/modules/files/infrastructure/validation/file-signature.validator.js';
import { FileValidatorPort } from './application/ports/file-validator.port.js';
import { GetFileMetaUseCase } from './application/use-cases/get-file-meta.use-case.js';
import { GetPublicFileAccessUseCase } from './application/use-cases/get-public-file-access.use-case.js';
import { SetVisibilityUseCase } from './application/use-cases/set-visibility.use-case.js';
import { UploadFileUseCase } from './application/use-cases/upload-file.use-case.js';
import { FilesController } from './presentation/http/files.controller.js';

@Module({
  imports: [AppConfigModule, PrismaModule, AuthModule],
  controllers: [FilesController, PublicFilesController],
  providers: [
    // Infrastructure
    LocalDriver,
    S3Driver,
    GCSDriver,
    StorageDriverProvider,
    FileSignatureValidator,
    {
      provide: FileValidatorPort,
      useExisting: FileSignatureValidator,
    },
    {
      provide: FILES_TOKENS.FILE_REPOSITORY,
      useClass: PrismaFileRepository,
    },

    // Use Cases (Manual Wiring)
    {
      provide: UploadFileUseCase,
      useFactory: (
        storage: IStorageDriver,
        repo: IFileRepository,
        configService: AppConfigService,
        validator: FileValidatorPort,
      ) => {
        const storageConfig = configService.storage();
        // Map bucket logic here or in config service.
        // Simplified mapping for now based on previous logic:
        let bucket = null;
        if (storageConfig.driver === 'gcs') bucket = storageConfig.gcs.bucket;
        else if (['s3', 'r2', 'spaces'].includes(storageConfig.driver))
          bucket = storageConfig.s3.bucket;

        return new UploadFileUseCase(
          storage,
          repo,
          {
            driver: storageConfig.driver,
            bucket: bucket || undefined,
          },
          validator,
        );
      },
      inject: [
        FILES_TOKENS.STORAGE_DRIVER,
        FILES_TOKENS.FILE_REPOSITORY,
        AppConfigService,
        FileValidatorPort,
      ],
    },
    {
      provide: GetDownloadUrlUseCase,
      useFactory: (storage: IStorageDriver, repo: IFileRepository) =>
        new GetDownloadUrlUseCase(storage, repo),
      inject: [FILES_TOKENS.STORAGE_DRIVER, FILES_TOKENS.FILE_REPOSITORY],
    },
    {
      provide: GetFileMetaUseCase,
      useFactory: (repo: IFileRepository) => new GetFileMetaUseCase(repo),
      inject: [FILES_TOKENS.FILE_REPOSITORY],
    },
    {
      provide: SetVisibilityUseCase,
      useFactory: (repo: IFileRepository) => new SetVisibilityUseCase(repo),
      inject: [FILES_TOKENS.FILE_REPOSITORY],
    },
    {
      provide: GetPublicFileAccessUseCase,
      useFactory: (repo: IFileRepository, storage: IStorageDriver) =>
        new GetPublicFileAccessUseCase(repo, storage),
      inject: [FILES_TOKENS.FILE_REPOSITORY, FILES_TOKENS.STORAGE_DRIVER],
    },
  ],
  exports: [UploadFileUseCase, GetFileMetaUseCase],
})
export class FilesModule {}
