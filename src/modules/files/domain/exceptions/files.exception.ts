import { AppException } from '#src/core/exceptions/app-exception.js';
import { AppErrorCode } from '#src/core/exceptions/error-definitions.js';

export class FilesException extends AppException {
  static notFound(id?: string) {
    return new FilesException({
      code: AppErrorCode.NOT_FOUND,
      messageKey: 'files.errors.not_found',
      details: id ? { id } : undefined,
    });
  }

  static invalidType(mimeType: string) {
    return new FilesException({
      code: AppErrorCode.VALIDATION_ERROR,
      messageKey: 'files.errors.invalid_type',
      details: { mimeType },
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
