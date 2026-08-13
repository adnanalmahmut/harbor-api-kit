import type { FileEntity, StorageDriver } from './file.entity.js';

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

/**
 * Everything the files module needs from storage-of-record.
 *
 * Abstract class rather than an interface so it doubles as the DI token, and
 * deliberately free of any Prisma type — `CreateFileProps` and
 * `UpdateFileProps` above are ours. The implementation lives in
 * `src/persistence/prisma/file.prisma.repository.ts` and is bound in
 * `PersistenceModule`.
 */
export abstract class FileRepository {
  abstract create(data: CreateFileProps): Promise<FileEntity>;
  abstract findAccessibleById(
    id: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<FileEntity | null>;
  abstract findByPublicToken(token: string): Promise<FileEntity | null>;
  abstract update(id: string, data: UpdateFileProps): Promise<FileEntity>;
  /** Soft delete. */
  abstract delete(id: string): Promise<FileEntity>;
  abstract restore(id: string): Promise<FileEntity>;
}
