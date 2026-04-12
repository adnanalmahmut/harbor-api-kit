import { FileEntity } from '#src/modules/files/domain/index.js';

interface FileResponse {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string | null;
  size: number | null;
  isPublic: boolean;
  createdAt: Date;
  downloadUrl: string;
  publicUrl?: string;
}

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
