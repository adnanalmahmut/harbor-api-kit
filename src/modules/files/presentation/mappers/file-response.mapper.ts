import { AppConfigService } from '#src/infrastructure/config/app-config.service.js';
import { FileEntity } from '#src/modules/files/domain/entities/file.entity.js';
import { FileResponseDto } from '#src/modules/files/presentation/http/dtos/files.dto.js';

export class FileResponseMapper {
  static map(
    file: FileEntity,
    configService: AppConfigService,
  ): FileResponseDto {
    return {
      id: file.id,
      fileName: file.fileName,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size ? Number(file.size) : null,
      isPublic: file.isPublic,
      createdAt: file.createdAt,
      downloadUrl: `/api/v1/files/${file.id}/download`,
      streamUrl: `/api/v1/files/${file.id}/stream`,
      publicUrl:
        file.isPublic && file.publicToken
          ? `/api/v1/public/files/${file.publicToken}`
          : undefined,
    };
  }
}
