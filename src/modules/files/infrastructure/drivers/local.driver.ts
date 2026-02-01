import { AppConfigService } from '#src/infrastructure/config/app-config.service.js';
import type {
  FileMetadata,
  IStorageDriver,
  ReadStreamOptions,
  SignedUrlOptions,
  UploadResult,
} from '#src/modules/files/application/ports/storage-driver.port.js';
import { FilesException } from '#src/modules/files/domain/exceptions/files.exception.js';
import { Injectable } from '@nestjs/common';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

@Injectable()
export class LocalDriver implements IStorageDriver {
  private readonly storagePath: string;
  private readonly appUrl: string;

  constructor(configService: AppConfigService) {
    const storageConfig = configService.storage();
    this.storagePath = path.resolve(storageConfig.local.path);
    this.appUrl = configService.app().frontendUrl; // Fallback for public URL base

    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  async uploadStream(
    key: string,
    stream: Readable,
    meta: FileMetadata,
  ): Promise<UploadResult> {
    const filePath = this.getFilePath(key);
    const writeStream = fs.createWriteStream(filePath);

    try {
      await pipeline(stream, writeStream);
      const stats = await fs.promises.stat(filePath);
      return { key, size: stats.size };
    } catch (error) {
      throw FilesException.storageError(error);
    }
  }

  async getReadStream(
    key: string,
    range?: ReadStreamOptions,
  ): Promise<Readable> {
    const filePath = this.getFilePath(key);
    if (!fs.existsSync(filePath)) {
      throw FilesException.notFound(key);
    }

    const options: { start?: number; end?: number } = {};
    if (range) {
      if (range.start !== undefined) options.start = range.start;
      if (range.end !== undefined) options.end = range.end;
    }

    return fs.createReadStream(filePath, options);
  }

  async getSignedUrl(key: string, options: SignedUrlOptions): Promise<string> {
    // Local driver doesn't support real signed URLs.
    // We return a proxy URL that requires authentication via the main API.
    // Format: /api/v1/files/:id/stream (The controller handles this redirection/proxying)
    // NOTE: This return value is often ignored by the controller in favor of proxying directly for local.
    return `/api/v1/files/${key}/stream`;
  }

  async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    if (fs.existsSync(filePath)) {
      try {
        await fs.promises.unlink(filePath);
      } catch (error) {
        throw FilesException.storageError(error);
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.getFilePath(key);
    return fs.existsSync(filePath);
  }

  private getFilePath(key: string): string {
    // Prevent path traversal
    const safeKey = path.basename(key);
    return path.join(this.storagePath, safeKey);
  }
}
