import { FilesException } from '../files.exception.js';
import type { IFileRepository } from '../ports/file.repository.port.js';

export class GetFileMetaUseCase {
  constructor(private readonly repository: IFileRepository) {}

  async execute(
    id: string,
    actor: { actorUserId: string; actorIsAdmin: boolean },
  ) {
    const file = await this.repository.findAccessibleById(
      id,
      actor.actorUserId,
      actor.actorIsAdmin,
    );
    if (!file || file.isDeleted) throw FilesException.notFound(id);
    return file;
  }
}
