import { AppConfigService } from '#src/infrastructure/config/app-config.service.js';
import type { IFileRepository } from '#src/modules/files/application/ports/file.repository.port.js';
import type { IStorageDriver } from '#src/modules/files/application/ports/storage-driver.port.js';
import { FilesException } from '#src/modules/files/domain/exceptions/files.exception.js';
import { Inject, Injectable } from '@nestjs/common';
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

@Injectable()
export class UploadFileUseCase {
  constructor(
    @Inject('IStorageDriver') private readonly storage: IStorageDriver,
    @Inject('IFileRepository') private readonly repository: IFileRepository,
    private readonly configService: AppConfigService,
  ) {}

  async execute(command: UploadFileCommand) {
    const fileId = crypto.randomUUID();
    const extension = path.extname(command.fileName);
    // Secure Key: files/{year}/{month}/{uuid}{ext}
    const date = new Date();
    const key = `files/${date.getFullYear()}/${date.getMonth() + 1}/${fileId}${extension}`;

    try {
      // 1. Upload to storage (Streaming)
      const uploadResult = await this.storage.uploadStream(key, command.file, {
        contentType: command.mimeType,
        contentLength: command.size,
      });

      // 2. Persist metadata
      const storageConfig = this.configService.storage();

      const file = await this.repository.create({
        id: fileId,
        fileName: command.fileName,
        originalName: command.fileName,
        filePath: uploadResult.key,
        mimeType: command.mimeType,
        size: BigInt(uploadResult.size),
        driver: this.mapDriverEnum(storageConfig.driver),
        bucket: this.getBucketName(storageConfig),
        uploadedBy: command.uploadedById
          ? { connect: { id: command.uploadedById } }
          : undefined,
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

  private getBucketName(config: any): string | null {
    if (config.driver === 'gcs') return config.gcs.bucket;
    if (['s3', 'r2', 'spaces'].includes(config.driver)) return config.s3.bucket;
    return null;
  }
}
