import { FilesException } from '#src/modules/files/application/exceptions/files.exception.js';
import type { IFileRepository } from '#src/modules/files/application/ports/file.repository.port.js';
import type { IFilesConfig } from '#src/modules/files/application/ports/files-config.port.js';
import type { IStorageDriver } from '#src/modules/files/application/ports/storage-driver.port.js';
import { StorageDriver } from '#src/modules/files/domain/enums/storage-driver.enum.js';
import crypto from 'node:crypto';
import path from 'node:path';
import { Readable } from 'node:stream';

interface UploadFileCommand {
  file: Readable;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedById?: string;
  isPublic?: boolean;
}

import { FileValidatorPort } from '#src/modules/files/application/ports/file-validator.port.js';

export class UploadFileUseCase {
  constructor(
    private readonly storage: IStorageDriver,
    private readonly repository: IFileRepository,
    private readonly config: IFilesConfig,
    private readonly validator: FileValidatorPort,
  ) {}

  async execute(command: UploadFileCommand) {
    const fileId = crypto.randomUUID();
    const extension = path.extname(command.fileName);
    // Secure Key: files/{year}/{month}/{uuid}{ext}
    const date = new Date();
    const key = `files/${date.getFullYear()}/${date.getMonth() + 1}/${fileId}${extension}`;

    try {
      // 0. Validate File Signature (Magic Bytes)
      await this.validator.validate(
        command.file,
        command.fileName,
        command.mimeType,
      );

      // 1. Upload to storage (Streaming)
      const uploadResult = await this.storage.uploadStream(key, command.file, {
        contentType: command.mimeType,
        contentLength: command.size,
      });

      // 2. Persist metadata
      const file = await this.repository.create({
        fileName: command.fileName,
        originalName: command.fileName,
        filePath: uploadResult.key,
        mimeType: command.mimeType,
        size: BigInt(uploadResult.size),
        driver: this.mapDriverEnum(this.config.driver) as StorageDriver,
        bucket: this.config.bucket ?? undefined,
        uploadedById: command.uploadedById,
        isPublic: command.isPublic ?? false,
        publicToken: crypto.randomUUID(), // Generate public token by default for easier sharing later
      });

      return file;
    } catch (error) {
      // If DB fails, try to cleanup storage? (Optional consistency check)
      throw FilesException.storageError(error);
    }
  }

  private mapDriverEnum(driver: string) {
    switch (driver) {
      case 'gcs':
        return 'GCS';
      case 'local':
        return 'LOCAL';
      default:
        return 'S3_COMPAT';
    }
  }
}
