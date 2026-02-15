import type { FileEntity } from '#src/modules/files/domain/entities/file.entity.js';
import { StorageDriver } from '#src/modules/files/domain/enums/storage-driver.enum.js';

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
