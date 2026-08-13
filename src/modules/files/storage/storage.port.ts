import type { Readable } from 'node:stream';

export interface FileMetadata {
  contentType: string;
  contentLength?: number;
}

export interface UploadResult {
  key: string;
  location?: string;
  eTag?: string;
  size: number;
}

export interface ReadStreamOptions {
  start?: number;
  end?: number;
}

export interface SignedUrlOptions {
  action: 'read' | 'write';
  expiresIn?: number; // seconds
  contentType?: string;
}

/**
 * The second swappable seam in this module: local disk today, S3-compatible
 * object storage in production. Bound by `StorageDriverProvider` from
 * configuration.
 */
export abstract class StorageDriverPort {
  /** Stream input directly to storage. */
  abstract uploadStream(
    key: string,
    stream: Readable,
    meta: FileMetadata,
  ): Promise<UploadResult>;

  /** Get a stream for proxying (fallback, or the local driver). */
  abstract getReadStream(
    key: string,
    range?: ReadStreamOptions,
  ): Promise<Readable>;

  /** Short-lived signed URL for direct client access (preferred for S3). */
  abstract getSignedUrl(
    key: string,
    options: SignedUrlOptions,
  ): Promise<string>;

  abstract delete(key: string): Promise<void>;
}

export abstract class FileValidatorPort {
  abstract validate(
    stream: Readable,
    fileName: string,
    mimeType: string,
  ): Promise<void>;
}
