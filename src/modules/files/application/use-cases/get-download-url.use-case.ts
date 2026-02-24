import { FilesException } from '../files.exception.js';
import type { IFileRepository } from '../ports/file.repository.port.js';
import type { IStorageDriver } from '../ports/storage-driver.port.js';

export class GetDownloadUrlUseCase {
  constructor(
    private readonly storage: IStorageDriver,
    private readonly repository: IFileRepository,
  ) {}

  async execute(
    id: string,
    actor: { actorUserId: string; actorIsAdmin: boolean },
  ): Promise<{ url: string; expiresIn?: number; isPublic: boolean }> {
    const file = await this.repository.findAccessibleById(
      id,
      actor.actorUserId,
      actor.actorIsAdmin,
    );
    if (!file || file.isDeleted) throw FilesException.notFound(id);

    const url = await this.storage.getSignedUrl(file.filePath, {
      action: 'read',
      expiresIn: 900, // 15 minutes
      contentType: file.mimeType || undefined,
    });

    return {
      // For local driver (relative paths), expose API download endpoint
      url: url.startsWith('/') ? `/api/v1/files/${file.id}/download` : url,
      expiresIn: 900,
      isPublic: file.isPublic,
    };
  }
}
