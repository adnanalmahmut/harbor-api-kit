import { PrismaService } from '#src/core/index.js';
import type { Prisma } from '#src/generated/prisma/client.js';
import {
  type CreateFileProps,
  type FileFilterParams,
  FilesException,
  type IFileRepository,
  type UpdateFileProps,
} from '#src/modules/files/application/index.js';
import { FileEntity } from '#src/modules/files/domain/index.js';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PrismaFileRepository implements IFileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateFileProps): Promise<FileEntity> {
    try {
      const file = await this.prisma.file.create({
        data: {
          fileName: data.fileName,
          filePath: data.filePath,
          originalName: data.originalName,
          mimeType: data.mimeType,
          size: data.size,
          bucket: data.bucket,
          driver: data.driver as any, // Cast to Prisma enum
          isPublic: data.isPublic,
          publicToken: data.publicToken,
          uploadedBy: data.uploadedById
            ? { connect: { id: data.uploadedById } }
            : undefined,
        },
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

  async findAccessibleById(
    id: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<FileEntity | null> {
    // Admin can access any file
    if (isAdmin) {
      return this.findById(id);
    }

    // Non-admin: must be owner or public
    const file = await this.prisma.file.findFirst({
      where: {
        id,
        OR: [{ isPublic: true }, { uploadedById: userId }],
      },
    });

    return file ? this.mapToEntity(file) : null;
  }

  async findByPublicToken(token: string): Promise<FileEntity | null> {
    const file = await this.prisma.file.findUnique({
      where: { publicToken: token },
    });
    return file ? this.mapToEntity(file) : null;
  }

  async update(id: string, data: UpdateFileProps): Promise<FileEntity> {
    // Check existence first to throw correct 404
    const exists = await this.findById(id);
    if (!exists) throw FilesException.notFound(id);

    try {
      const file = await this.prisma.file.update({
        where: { id },
        data: {
          ...data,
        },
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

  async findAll(params: FileFilterParams): Promise<[FileEntity[], number]> {
    const where: Prisma.FileWhereInput = {};
    if (params.where?.uploadedById) {
      where.uploadedById = params.where.uploadedById;
    }
    if (params.where?.isPublic !== undefined) {
      where.isPublic = params.where.isPublic;
    }
    if (params.where?.mimeType) {
      where.mimeType = params.where.mimeType;
    }
    if (params.where?.driver) {
      where.driver = params.where.driver as any; // Cast to Prisma enum
    }

    const [files, count] = await Promise.all([
      this.prisma.file.findMany({
        skip: params.skip,
        take: params.take,
        where,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.file.count({ where }),
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
