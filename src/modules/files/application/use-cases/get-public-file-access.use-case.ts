import { FilesException } from '../files.exception.js';
import type { IFileRepository } from '../ports/file.repository.port.js';
import type { IStorageDriver } from '../ports/storage-driver.port.js';

type PublicUrlResult = {
  url: string;
  expiresIn: number;
  mimeType?: string;
  isPublic: boolean;
};

export class GetPublicFileAccessUseCase {
  constructor(
    private readonly repository: IFileRepository,
    private readonly storage: IStorageDriver,
  ) {}

  async execute(token: string): Promise<PublicUrlResult> {
    const file = await this.repository.findByPublicToken(token);
    if (!file || !file.isPublic) {
      throw FilesException.notFound();
    }

    const urlOrPath = await this.storage.getSignedUrl(file.filePath, {
      action: 'read',
      expiresIn: 300,
      contentType: file.mimeType || undefined,
    });

    return {
      url: urlOrPath,
      expiresIn: 300,
      mimeType: file.mimeType || undefined,
      isPublic: true,
    };
  }
}
