import { AppConfigService } from '#src/core/index.js';
import {
  FilesException,
  type FileMetadata,
  type IStorageDriver,
  type ReadStreamOptions,
  type SignedUrlOptions,
  type UploadResult,
} from '#src/modules/files/application/index.js';
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
    this.appUrl = configService.app().publicUrl;

    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  async uploadStream(
    key: string,
    stream: Readable,
    meta: FileMetadata,
  ): Promise<UploadResult> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _meta = meta;
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

  // eslint-disable-next-line @typescript-eslint/require-await
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

  // eslint-disable-next-line @typescript-eslint/require-await
  async getSignedUrl(key: string, options: SignedUrlOptions): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _options = options;
    // Local driver returns a placeholder URL with storage key. The caller
    // (GetDownloadUrlUseCase.normalizeDownloadUrl) detects the relative path
    // and rewrites it to use the file's UUID id before returning to the client.
    return `${this.appUrl}/api/v1/files/${key}/download`;
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

  // eslint-disable-next-line @typescript-eslint/require-await
  async exists(key: string): Promise<boolean> {
    const filePath = this.getFilePath(key);
    return fs.existsSync(filePath);
  }

  private getFilePath(key: string): string {
    // Normalize and prevent path traversal while preserving subdirectory structure
    const normalized = path.normalize(key).replace(/^(\.\.[/\\])+/, '');
    const fullPath = path.resolve(this.storagePath, normalized);

    // Ensure resolved path is still within the storage root
    if (!fullPath.startsWith(this.storagePath)) {
      throw FilesException.storageError(new Error('Path traversal detected'));
    }

    // Ensure parent directory exists for nested keys (e.g., files/2026/01/uuid.jpg)
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    return fullPath;
  }
}
