import { FileEntity } from '#src/modules/files/domain/entities/file.entity.js';
import type { FileResponse } from '../dtos/file.response.js';

export class FileResponseMapper {
  static map(file: FileEntity): FileResponse {
    return {
      id: file.id,
      fileName: file.fileName,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size ? Number(file.size) : null,
      isPublic: file.isPublic,
      createdAt: file.createdAt,
      downloadUrl: `/api/v1/files/${file.id}/download`,
      publicUrl:
        file.isPublic && file.publicToken
          ? `/api/v1/public/files/${file.publicToken}`
          : undefined,
    };
  }
}
