import { FilesException } from '#src/modules/files/application/exceptions/files.exception.js';
import type { IFileRepository } from '#src/modules/files/application/ports/file.repository.port.js';
import crypto from 'node:crypto';

export class SetVisibilityUseCase {
  constructor(private readonly repository: IFileRepository) {}

  async execute(id: string, isPublic: boolean) {
    const file = await this.repository.findById(id);
    if (!file || file.isDeleted) throw FilesException.notFound(id);

    let token = file.publicToken;
    if (isPublic && !token) {
      token = crypto.randomUUID();
    }

    const updated = await this.repository.update(id, {
      isPublic,
      publicToken: token,
    });

    return updated;
  }
}
