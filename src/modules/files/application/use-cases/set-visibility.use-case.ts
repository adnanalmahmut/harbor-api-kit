import { FilesException } from '#src/modules/files/application/exceptions/files.exception.js';
import type { IFileRepository } from '#src/modules/files/application/ports/file.repository.port.js';
import crypto from 'node:crypto';

export class SetVisibilityUseCase {
  constructor(private readonly repository: IFileRepository) {}

  async execute(
    id: string,
    isPublic: boolean,
    actor: { actorUserId: string; actorIsAdmin: boolean },
  ) {
    // Check ownership/permission first
    const file = await this.repository.findAccessibleById(
      id,
      actor.actorUserId,
      actor.actorIsAdmin,
    );
    if (!file || file.isDeleted) throw FilesException.notFound(id);

    // Only owner or admin can change visibility
    if (!actor.actorIsAdmin && file.uploadedById !== actor.actorUserId) {
      throw FilesException.accessDenied();
    }

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
