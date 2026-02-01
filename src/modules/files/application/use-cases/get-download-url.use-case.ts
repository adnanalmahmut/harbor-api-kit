import { FilesException } from '#src/modules/files/application/exceptions/files.exception.js';
import type { IFileRepository } from '#src/modules/files/application/ports/file.repository.port.js';
import type { IStorageDriver } from '#src/modules/files/application/ports/storage-driver.port.js';

export class GetDownloadUrlUseCase {
  constructor(
    private readonly storage: IStorageDriver,
    private readonly repository: IFileRepository,
  ) {}

  async execute(id: string, userId?: string) {
    const file = await this.repository.findById(id);
    if (!file || file.isDeleted) throw FilesException.notFound(id);

    // Basic access control logic
    if (!file.isPublic && !userId) {
      // Should be handled by Guard, but double check
      throw FilesException.accessDenied();
    }
    // Note: strict RBAC ownership check is done in controller/guards

    const url = await this.storage.getSignedUrl(file.filePath, {
      action: 'read',
      expiresIn: 900, // 15 minutes
      contentType: file.mimeType || undefined,
    });

    if (url.startsWith('/')) {
      const stream = await this.storage.getReadStream(file.filePath);
      return {
        stream,
        mimeType: file.mimeType || 'application/octet-stream',
        isPublic: file.isPublic,
      };
    }

    return {
      url,
      expiresIn: 900,
      isPublic: file.isPublic,
    };
  }
}
