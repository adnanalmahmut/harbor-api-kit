import type { IFileRepository } from '#src/modules/files/application/ports/file.repository.port.js';
import { FilesException } from '#src/modules/files/domain/exceptions/files.exception.js';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class GetFileMetaUseCase {
  constructor(
    @Inject('IFileRepository') private readonly repository: IFileRepository,
  ) {}

  async execute(id: string) {
    const file = await this.repository.findById(id);
    if (!file || file.isDeleted) throw FilesException.notFound(id);
    return file;
  }
}
