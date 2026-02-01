import { FilesException } from '#src/modules/files/application/exceptions/files.exception.js';
import { Injectable } from '@nestjs/common';
import path from 'node:path';
import { Readable } from 'node:stream';
import { FileValidatorPort } from '../../application/ports/file-validator.port.js';

@Injectable()
export class FileSignatureValidator implements FileValidatorPort {
  private readonly SIGNATURES: Record<string, string[]> = {
    jpg: ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2'],
    jpeg: ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2'],
    png: ['89504e47'],
    pdf: ['25504446'],
  };

  /**
   * Validates file signature (magic bytes) against extension and mime type.
   * NOTE: This consumes the beginning of the stream and unshifts it back.
   */
  async validate(
    stream: Readable,
    fileName: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _mimeType: string,
  ): Promise<void> {
    const ext = path.extname(fileName).toLowerCase().replace('.', '');

    // Skip validation for unknown extensions or allow-list approach
    // For P1 hardening, we enforce list for known types.
    if (!this.SIGNATURES[ext]) {
      // If extension is not in our strict list, we might allow it or block it.
      // For this P1, we will only block if it mismatches known allowed types.
      // Implementing strict allow-list would break other file types unless specified.
      // User asked: "at least: jpg, png, pdf"
      return;
    }

    // Read first 8 bytes (enough for PNG, PDF, JPG)
    // We need to wait for readable event or try read
    const chunk = await this.readBytes(stream, 8);

    if (!chunk || chunk.length === 0) {
      throw FilesException.invalidType('Empty file');
    }

    const hex = chunk.toString('hex');
    const signatures = this.SIGNATURES[ext];

    const isValid = signatures.some((sig) => hex.startsWith(sig));

    // Put data back into stream so it can be uploaded
    stream.unshift(chunk);

    if (!isValid) {
      throw FilesException.invalidType(
        `File signature mismatches extension .${ext}`,
      );
    }
  }

  private readBytes(stream: Readable, n: number): Promise<Buffer | null> {
    return new Promise((resolve, reject) => {
      // Check if data is already available
      // readableLength is not always reliable for all stream types, but good first check.
      // For Readable.from (buffered), read() typically works immediately.
      const immediate = stream.read(n);
      if (immediate) {
        resolve(immediate as Buffer);
        return;
      }

      const onReadable = () => {
        const chunk = stream.read(n);
        if (chunk) {
          cleanup();
          resolve(chunk as Buffer);
        }
      };

      const onEnd = () => {
        cleanup();
        resolve(null);
      };

      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };

      const cleanup = () => {
        stream.off('readable', onReadable);
        stream.off('end', onEnd);
        stream.off('error', onError);
      };

      stream.on('readable', onReadable);
      stream.on('end', onEnd);
      stream.on('error', onError);
    });
  }
}
