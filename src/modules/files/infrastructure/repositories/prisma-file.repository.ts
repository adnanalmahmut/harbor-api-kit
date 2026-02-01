import type { Prisma } from '#src/generated/prisma/client.js';
import { PrismaService } from '#src/infrastructure/db/prisma/prisma.service.js';
import { FileEntity } from '#src/modules/files/domain/entities/file.entity.js';
import { FilesException } from '#src/modules/files/domain/exceptions/files.exception.js';
import { Injectable } from '@nestjs/common';
import type { IFileRepository } from '../../application/ports/file.repository.port.js';

@Injectable()
export class PrismaFileRepository implements IFileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.FileCreateInput): Promise<FileEntity> {
    try {
      const file = await this.prisma.file.create({
        data,
      });
      return this.mapToEntity(file);
    } catch (error) {
      throw FilesException.storageError(error);
    }
  }

  async findById(id: string): Promise<FileEntity | null> {
    const file = await this.prisma.file.findUnique({
      where: { id },
    });
    return file ? this.mapToEntity(file) : null;
  }

  async findByPublicToken(token: string): Promise<FileEntity | null> {
    const file = await this.prisma.file.findUnique({
      where: { publicToken: token },
    });
    return file ? this.mapToEntity(file) : null;
  }

  async update(id: string, data: Prisma.FileUpdateInput): Promise<FileEntity> {
    // Check existence first to throw correct 404
    const exists = await this.findById(id);
    if (!exists) throw FilesException.notFound(id);

    try {
      const file = await this.prisma.file.update({
        where: { id },
        data,
      });
      return this.mapToEntity(file);
    } catch (error) {
      throw FilesException.storageError(error);
    }
  }

  async delete(id: string): Promise<FileEntity> {
    // Soft delete
    return this.update(id, { deletedAt: new Date() });
  }

  async restore(id: string): Promise<FileEntity> {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file) throw FilesException.notFound(id);

    try {
      const restored = await this.prisma.file.update({
        where: { id },
        data: { deletedAt: null },
      });
      return this.mapToEntity(restored);
    } catch (error) {
      throw FilesException.storageError(error);
    }
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.FileWhereInput;
  }): Promise<[FileEntity[], number]> {
    const [files, count] = await Promise.all([
      this.prisma.file.findMany({
        skip: params.skip,
        take: params.take,
        where: params.where,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.file.count({ where: params.where }),
    ]);

    return [files.map(this.mapToEntity), count];
  }

  private mapToEntity(
    // prisma generated type including BigInt
    raw: any,
  ): FileEntity {
    return new FileEntity(
      raw.id,
      raw.fileName,
      raw.filePath,
      raw.originalName,
      raw.mimeType,
      raw.size,
      raw.bucket,
      raw.driver,
      raw.isPublic,
      raw.publicToken,
      raw.uploadedById,
      raw.createdAt,
      raw.updatedAt,
      raw.deletedAt,
    );
  }
}
