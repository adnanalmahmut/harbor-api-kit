import { AppConfigService } from '#src/core/index.js';
import {
  FilesException,
  type FileMetadata,
  type IStorageDriver,
  type ReadStreamOptions,
  type SignedUrlOptions,
  type UploadResult,
} from '../../application/index.js';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { Readable } from 'node:stream';

@Injectable()
export class S3Driver implements IStorageDriver {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(configService: AppConfigService) {
    const config = configService.storage();

    this.bucket = config.s3.bucket!;
    this.client = new S3Client({
      region: config.s3.region,
      endpoint: config.s3.endpoint,
      credentials: {
        accessKeyId: config.s3.accessKeyId!,
        secretAccessKey: config.s3.secretAccessKey!,
      },
      forcePathStyle: true,
    });
  }

  async uploadStream(
    key: string,
    stream: Readable,
    meta: FileMetadata,
  ): Promise<UploadResult> {
    try {
      const upload = new Upload({
        client: this.client,
        params: {
          Bucket: this.bucket,
          Key: key,
          Body: stream,
          ContentType: meta.contentType,
        },
      });

      const result = await upload.done();

      // Get accurate size from storage
      const headParams = { Bucket: this.bucket, Key: key };
      const head = await this.client.send(new HeadObjectCommand(headParams));

      return {
        key,
        location: result.Location,
        eTag: result.ETag,
        size: head.ContentLength ?? 0,
      };
    } catch (error) {
      throw FilesException.storageError(error);
    }
  }

  async getReadStream(
    key: string,
    range?: ReadStreamOptions,
  ): Promise<Readable> {
    try {
      const rangeHeader =
        range?.start !== undefined
          ? `bytes=${range.start}-${range.end ?? ''}`
          : undefined;

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Range: rangeHeader,
      });

      const response = await this.client.send(command);

      if (!response.Body) {
        throw FilesException.notFound(key);
      }

      return response.Body as Readable;
    } catch (error: any) {
      if (error.name === 'NoSuchKey') {
        throw FilesException.notFound(key);
      }
      throw FilesException.storageError(error);
    }
  }

  async getSignedUrl(key: string, options: SignedUrlOptions): Promise<string> {
    try {
      const command =
        options.action === 'read'
          ? new GetObjectCommand({ Bucket: this.bucket, Key: key })
          : new HeadObjectCommand({ Bucket: this.bucket, Key: key });

      return await getSignedUrl(this.client, command, {
        expiresIn: options.expiresIn ?? 900,
      });
    } catch (error) {
      throw FilesException.storageError(error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      throw FilesException.storageError(error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return true;
    } catch (error: any) {
      if (
        error.name === 'NotFound' ||
        error.$metadata?.httpStatusCode === 404
      ) {
        return false;
      }
      throw error;
    }
  }
}
