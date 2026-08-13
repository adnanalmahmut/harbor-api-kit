import { AuthModule } from '#src/modules/auth/auth.module.js';
import { AuthorizationModule } from '#src/modules/authorization/authorization.module.js';
import { Module } from '@nestjs/common';
import { FilesController } from './files.controller.js';
import { FilesService } from './files.service.js';
import { PublicFilesController } from './public-files.controller.js';
import { FileSignatureValidator } from './storage/file-signature.validator.js';
import { LocalDriver } from './storage/local.driver.js';
import { S3Driver } from './storage/s3.driver.js';
import { StorageDriverProvider } from './storage/storage-driver.factory.js';
import { FileValidatorPort } from './storage/storage.port.js';

// `FileRepository` is provided globally by PersistenceModule.
@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [FilesController, PublicFilesController],
  providers: [
    FilesService,
    LocalDriver,
    S3Driver,
    StorageDriverProvider,
    FileSignatureValidator,
    { provide: FileValidatorPort, useExisting: FileSignatureValidator },
  ],
  exports: [FilesService],
})
export class FilesModule {}
