import type { Prisma } from '#src/generated/prisma/client.js';
import type { FileEntity } from '#src/modules/files/domain/entities/file.entity.js';

export interface IFileRepository {
  create(data: Prisma.FileCreateInput): Promise<FileEntity>;
  findById(id: string): Promise<FileEntity | null>;
  findByPublicToken(token: string): Promise<FileEntity | null>;
  update(id: string, data: Prisma.FileUpdateInput): Promise<FileEntity>;
  delete(id: string): Promise<FileEntity>; // Soft delete
  restore(id: string): Promise<FileEntity>;
  findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.FileWhereInput;
  }): Promise<[FileEntity[], number]>;
}
