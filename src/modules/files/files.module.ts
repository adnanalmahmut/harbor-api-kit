import { AppConfigModule } from '#src/infrastructure/config/app-config.module.js';
import { PrismaModule } from '#src/infrastructure/db/prisma/prisma.module.js';
import { AuthModule } from '#src/modules/auth/auth.module.js';
import { StorageDriverProvider } from '#src/modules/files/infrastructure/adapters/storage-driver.factory.js';
import { GCSDriver } from '#src/modules/files/infrastructure/drivers/gcs.driver.js';
import { LocalDriver } from '#src/modules/files/infrastructure/drivers/local.driver.js';
import { S3Driver } from '#src/modules/files/infrastructure/drivers/s3.driver.js';
import { PrismaFileRepository } from '#src/modules/files/infrastructure/repositories/prisma-file.repository.js';
import { PublicFilesController } from '#src/modules/files/presentation/http/public-files.controller.js';
import { Module } from '@nestjs/common';
import { GetDownloadUrlUseCase } from './application/use-cases/get-download-url.use-case.js';
import { GetFileMetaUseCase } from './application/use-cases/get-file-meta.use-case.js';
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
    {
      provide: 'IFileRepository',
      useClass: PrismaFileRepository,
    },

    // Use Cases
    UploadFileUseCase,
    GetDownloadUrlUseCase,
    GetFileMetaUseCase,
    SetVisibilityUseCase,
  ],
  exports: [UploadFileUseCase, GetFileMetaUseCase],
})
export class FilesModule {}
