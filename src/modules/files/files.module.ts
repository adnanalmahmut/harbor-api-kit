import { storageConfig } from '#src/config/index.js';
import { PrismaModule } from '#src/core/index.js';
import { AuthModule } from '#src/modules/auth/auth.module.js';
import { RbacModule } from '#src/modules/rbac/rbac.module.js';
import { Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import {
  FileValidatorPort,
  GetDownloadUrlUseCase,
  GetFileMetaUseCase,
  GetPublicFileAccessUseCase,
  SetVisibilityUseCase,
  StreamFileUseCase,
  StreamPublicFileUseCase,
  UploadFileUseCase,
  type IFileRepository,
  type IStorageDriver,
} from './application/index.js';
import { FILES_TOKENS } from './files.tokens.js';
import {
  FileSignatureValidator,
  LocalDriver,
  PrismaFileRepository,
  S3Driver,
  StorageDriverProvider,
} from './infrastructure/index.js';
import { FilesController } from './presentation/files.controller.js';
import { PublicFilesController } from './presentation/public-files.controller.js';

@Module({
  imports: [PrismaModule, AuthModule, RbacModule],
  controllers: [FilesController, PublicFilesController],
  providers: [
    // Infrastructure
    LocalDriver,
    S3Driver,
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
        config: ConfigType<typeof storageConfig>,
        validator: FileValidatorPort,
      ) => {
        let bucket = null;
        if (['s3', 'r2', 'spaces'].includes(config.driver))
          bucket = config.s3.bucket;

        return new UploadFileUseCase(
          storage,
          repo,
          {
            driver: config.driver,
            bucket: bucket || undefined,
          },
          validator,
        );
      },
      inject: [
        FILES_TOKENS.STORAGE_DRIVER,
        FILES_TOKENS.FILE_REPOSITORY,
        storageConfig.KEY,
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
    {
      provide: StreamFileUseCase,
      useFactory: (storage: IStorageDriver, repo: IFileRepository) =>
        new StreamFileUseCase(storage, repo),
      inject: [FILES_TOKENS.STORAGE_DRIVER, FILES_TOKENS.FILE_REPOSITORY],
    },
    {
      provide: StreamPublicFileUseCase,
      useFactory: (storage: IStorageDriver, repo: IFileRepository) =>
        new StreamPublicFileUseCase(storage, repo),
      inject: [FILES_TOKENS.STORAGE_DRIVER, FILES_TOKENS.FILE_REPOSITORY],
    },
  ],
  exports: [UploadFileUseCase, GetFileMetaUseCase],
})
export class FilesModule {}
