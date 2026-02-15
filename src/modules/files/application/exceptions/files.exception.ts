import { AppException } from '#src/core/domain/exceptions/app-exception.js';
import { AppErrorCode } from '#src/core/domain/exceptions/error-definitions.js';

export type InvalidFileReason =
  | 'extension_not_allowed'
  | 'empty_file'
  | 'signature_mismatch'
  | 'mime_type_mismatch';

export class FilesException extends AppException {
  static notFound(id?: string) {
    return new FilesException({
      code: AppErrorCode.NOT_FOUND,
      messageKey: 'files.errors.not_found',
      details: id ? { id } : undefined,
    });
  }

  static invalidType(params: {
    reason: InvalidFileReason;
    extension?: string;
    mimeType?: string;
  }) {
    return new FilesException({
      code: AppErrorCode.VALIDATION_ERROR,
      messageKey: 'files.errors.invalid_type',
      details: params,
    });
  }

  static invalidRequest(reason: 'multipart_required' | 'no_file_uploaded') {
    return new FilesException({
      code: AppErrorCode.VALIDATION_ERROR,
      messageKey: 'files.errors.invalid_request',
      details: { reason },
    });
  }

  static fileTooLarge(size: number, limit: number) {
    return new FilesException({
      code: AppErrorCode.VALIDATION_ERROR,
      messageKey: 'files.errors.file_too_large',
      details: { size, limit },
    });
  }

  static storageError(cause?: unknown) {
    return new FilesException({
      code: AppErrorCode.INTERNAL_ERROR,
      messageKey: 'files.errors.storage_error',
      cause,
    });
  }

  static accessDenied() {
    return new FilesException({
      code: AppErrorCode.FORBIDDEN,
      messageKey: 'files.errors.access_denied',
    });
  }
}
