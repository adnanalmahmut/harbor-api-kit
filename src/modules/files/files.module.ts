import {
  AppConfigModule,
  AppConfigService,
  PrismaModule,
} from '#src/core/index.js';
import { AuthModule } from '#src/modules/auth/index.js';
import {
  FileValidatorPort,
  GetDownloadUrlUseCase,
  GetFileMetaUseCase,
  GetPublicFileAccessUseCase,
  SetVisibilityUseCase,
  UploadFileUseCase,
  type IFileRepository,
  type IStorageDriver,
} from '#src/modules/files/application/index.js';
import { FILES_TOKENS } from '#src/modules/files/files.tokens.js';
import {
  FileSignatureValidator,
  GCSDriver,
  LocalDriver,
  PrismaFileRepository,
  S3Driver,
  StorageDriverProvider,
} from '#src/modules/files/infrastructure/index.js';
import {
  FilesController,
  PublicFilesController,
} from '#src/modules/files/presentation/index.js';
import { RbacModule } from '#src/modules/rbac/rbac.module.js';
import { Module } from '@nestjs/common';

@Module({
  imports: [AppConfigModule, PrismaModule, AuthModule, RbacModule],
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
