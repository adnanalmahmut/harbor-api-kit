import type { StorageDriver } from '#src/generated/prisma/enums.js';

export class FileEntity {
  constructor(
    public readonly id: string,
    public readonly fileName: string,
    public readonly filePath: string,
    public readonly originalName: string,
    public readonly mimeType: string | null,
    public readonly size: bigint | null,
    public readonly bucket: string | null,
    public readonly driver: StorageDriver,
    public readonly isPublic: boolean,
    public readonly publicToken: string | null,
    public readonly uploadedById: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly deletedAt: Date | null,
  ) {}

  get isDeleted(): boolean {
    return this.deletedAt !== null;
  }
}
