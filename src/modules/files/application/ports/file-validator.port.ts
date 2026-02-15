import type { Readable } from 'node:stream';

export interface BoxedFileStream {
  stream: Readable;
}

export abstract class FileValidatorPort {
  abstract validate(
    stream: Readable,
    fileName: string,
    mimeType: string,
  ): Promise<void>;
}
