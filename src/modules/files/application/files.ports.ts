import type { FileEntity, StorageDriver } from '../domain/index.js';
import type { Readable } from 'node:stream';

/* -------------------------------------------------------------------------- */
/*                                   Common                                   */
/* -------------------------------------------------------------------------- */

export interface BoxedFileStream {
  stream: Readable;
}

/* -------------------------------------------------------------------------- */
/*                              Validator Port                                */
/* -------------------------------------------------------------------------- */

export abstract class FileValidatorPort {
  abstract validate(
    stream: Readable,
    fileName: string,
    mimeType: string,
  ): Promise<void>;
}

/* -------------------------------------------------------------------------- */
/*                               Files Config Port                            */
/* -------------------------------------------------------------------------- */

export interface IFilesConfig {
  driver: string;
  bucket?: string;
}

/* -------------------------------------------------------------------------- */
/*                              Repository Port                               */
/* -------------------------------------------------------------------------- */

export interface CreateFileProps {
  fileName: string;
  filePath: string;
  originalName: string;
  mimeType: string;
  size: bigint;
  bucket?: string;
  driver: StorageDriver;
  isPublic: boolean;
  publicToken?: string;
  uploadedById?: string;
}

export interface UpdateFileProps {
  fileName?: string;
  isPublic?: boolean;
  publicToken?: string | null;
  deletedAt?: Date | null;
}

export interface FileFilterParams {
  skip?: number;
  take?: number;
  where?: {
    uploadedById?: string;
    isPublic?: boolean;
    mimeType?: string;
    driver?: StorageDriver;
  };
}

export interface IFileRepository {
  create(data: CreateFileProps): Promise<FileEntity>;
  findById(id: string): Promise<FileEntity | null>;
  findAccessibleById(
    id: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<FileEntity | null>;
  findByPublicToken(token: string): Promise<FileEntity | null>;
  update(id: string, data: UpdateFileProps): Promise<FileEntity>;
  delete(id: string): Promise<FileEntity>; // Soft delete
  restore(id: string): Promise<FileEntity>;
  findAll(params: FileFilterParams): Promise<[FileEntity[], number]>;
}

/* -------------------------------------------------------------------------- */
/*                               Storage Driver Port                          */
/* -------------------------------------------------------------------------- */

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
