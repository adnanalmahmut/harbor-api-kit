import { FileEntity } from '#src/modules/files/domain/index.js';
import type { FileResponse } from './file.response.js';

export class FileResponseMapper {
  static map(file: FileEntity, appUrl: string): FileResponse {
    const baseUrl = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl;
    return {
      id: file.id,
      fileName: file.fileName,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size ? Number(file.size) : null,
      isPublic: file.isPublic,
      createdAt: file.createdAt,
      downloadUrl: `${baseUrl}/api/v1/files/${file.id}/download`,
      publicUrl:
        file.isPublic && file.publicToken
          ? `${baseUrl}/api/v1/public/files/${file.publicToken}`
          : undefined,
    };
  }
}
