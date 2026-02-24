import { AppConfigService } from '#src/core/index.js';
import { FilesException } from '#src/modules/files/application/files.exception.js';
import type {
  FileMetadata,
  IStorageDriver,
  ReadStreamOptions,
  SignedUrlOptions,
  UploadResult,
} from '#src/modules/files/application/ports/storage-driver.port.js';
import { Storage } from '@google-cloud/storage';
import { Injectable } from '@nestjs/common';
import { Readable } from 'node:stream';

@Injectable()
export class GCSDriver implements IStorageDriver {
  private readonly storage: Storage;
  private readonly bucketName: string;

  constructor(configService: AppConfigService) {
    const config = configService.storage();
    this.bucketName = config.gcs.bucket!;

    const options: any = {
      projectId: config.gcs.projectId,
    };

    if (config.gcs.keyFile) {
      options.keyFilename = config.gcs.keyFile;
    }

    this.storage = new Storage(options);
  }

  async uploadStream(
    key: string,
    stream: Readable,
    meta: FileMetadata,
  ): Promise<UploadResult> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(key);

    const writeStream = file.createWriteStream({
      contentType: meta.contentType,
      resumable: false, // Simple streaming for now
    });

    return new Promise((resolve, reject) => {
      stream
        .pipe(writeStream)
        .on('error', (err) => reject(FilesException.storageError(err)))
        .on('finish', () => {
          file
            .getMetadata()
            .then(([metadata]) => {
              resolve({
                key,
                size: Number(metadata.size) || 0,
              });
            })
            .catch((error) => {
              reject(FilesException.storageError(error));
            });
        });
    });
  }

  async getReadStream(
    key: string,
    range?: ReadStreamOptions,
  ): Promise<Readable> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(key);

    const [exists] = await file.exists();
    if (!exists) {
      throw FilesException.notFound(key);
    }

    const options: { start?: number; end?: number } = {};
    if (range) {
      options.start = range.start;
      options.end = range.end;
    }

    return file.createReadStream(options);
  }

  async getSignedUrl(key: string, options: SignedUrlOptions): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(key);

    const [url] = await file.getSignedUrl({
      action: options.action,
      expires: Date.now() + (options.expiresIn ?? 900) * 1000,
    });

    return url;
  }

  async delete(key: string): Promise<void> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(key);

    try {
      await file.delete();
    } catch (error: any) {
      if (error.code !== 404) {
        throw FilesException.storageError(error);
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(key);
    const [exists] = await file.exists();
    return exists;
  }
}
