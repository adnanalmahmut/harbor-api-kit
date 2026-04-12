import {
  FilesException,
  FileValidatorPort,
} from '#src/modules/files/application/index.js';
import { Injectable } from '@nestjs/common';
import path from 'node:path';
import { Readable } from 'node:stream';

@Injectable()
export class FileSignatureValidator implements FileValidatorPort {
  private readonly SIGNATURES: Record<string, string[]> = {
    jpg: ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2', 'ffd8ffdb', 'ffd8ffee'], // Expanded JPEG signatures
    jpeg: ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2', 'ffd8ffdb', 'ffd8ffee'],
    png: ['89504e47'],
    pdf: ['25504446'],
    gif: ['47494638'], // GIF87a/GIF89a
    webp: ['52494646'], // WEBP (RIFF)
    doc: ['d0cf11e0'], // OLE2 compound file (legacy Office)
    xls: ['d0cf11e0'], // OLE2 compound file (legacy Office)
    docx: ['504b0304'], // ZIP/OOXML
    xlsx: ['504b0304'], // ZIP/OOXML
  };

  private readonly ALLOWED_EXTENSIONS = new Set([
    'jpg',
    'jpeg',
    'png',
    'pdf',
    'gif',
    'webp',
    'txt',
    'csv',
    'json',
    'doc',
    'docx',
    'xls',
    'xlsx',
  ]);

  private readonly ALLOWED_MIMES: Record<string, string[]> = {
    jpg: ['image/jpeg'],
    jpeg: ['image/jpeg'],
    png: ['image/png'],
    pdf: ['application/pdf'],
    gif: ['image/gif'],
    webp: ['image/webp'],
    txt: ['text/plain'],
    csv: ['text/csv', 'text/plain'],
    json: ['application/json', 'text/plain'],
    doc: ['application/msword'],
    docx: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    xls: ['application/vnd.ms-excel'],
    xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  };

  /**
   * Validates file signature (magic bytes) against extension and mime type.
   * NOTE: This consumes the beginning of the stream and unshifts it back.
   */
  async validate(
    stream: Readable,
    fileName: string,
    mimeType: string,
  ): Promise<void> {
    const ext = path.extname(fileName).toLowerCase().replace('.', '');

    if (!ext || !this.ALLOWED_EXTENSIONS.has(ext)) {
      throw FilesException.invalidType({
        reason: 'extension_not_allowed',
        extension: ext || undefined,
      });
    }

    // Validate MIME type against allowlist
    const allowedMimes = this.ALLOWED_MIMES[ext];
    if (allowedMimes && !allowedMimes.includes(mimeType)) {
      throw FilesException.invalidType({
        reason: 'mime_type_mismatch',
        extension: ext,
        mimeType,
      });
    }

    // Skip signature validation for extensions without defined signatures (e.g. txt, csv)
    if (!this.SIGNATURES[ext]) {
      return;
    }

    // Read first 8 bytes (enough for PNG, PDF, JPG)
    // We need to wait for readable event or try read
    const chunk = await this.readBytes(stream, 8);

    if (!chunk || chunk.length === 0) {
      throw FilesException.invalidType({
        reason: 'empty_file',
      });
    }

    const hex = chunk.toString('hex');
    const signatures = this.SIGNATURES[ext];

    const isValid = signatures.some((sig) => hex.startsWith(sig));

    // Put data back into stream so it can be uploaded
    stream.unshift(chunk);

    if (!isValid) {
      throw FilesException.invalidType({
        reason: 'signature_mismatch',
        extension: ext,
      });
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
