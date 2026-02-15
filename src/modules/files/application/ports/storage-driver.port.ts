import { Readable } from 'node:stream';

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

export interface IStorageDriver {
  /**
   * Stream input directly to storage
   */
  uploadStream(
    key: string,
    stream: Readable,
    meta: FileMetadata,
  ): Promise<UploadResult>;

  /**
   * Get stream for proxying (fallback or local)
   */
  getReadStream(key: string, range?: ReadStreamOptions): Promise<Readable>;

  /**
   * Get short-lived signed URL for direct client access (preferred for S3/GCS)
   */
  getSignedUrl(key: string, options: SignedUrlOptions): Promise<string>;

  /**
   * Delete object from storage
   */
  delete(key: string): Promise<void>;

  /**
   * Check if object exists
   */
  exists(key: string): Promise<boolean>;
}
