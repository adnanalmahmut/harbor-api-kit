import { AppErrorCode } from '#src/core/exceptions/error-definitions.js';
import {
  type ApiResponseConfig,
  createApiError,
  createApiResponseConfig,
  createApiSuccess,
} from '#src/shared/http/decorators/api-errors.decorator.js';
import { HttpStatus } from '@nestjs/common';
import { FileResponseDto } from './dtos/files.dto.js';

export const FILES_RESPONSES = {
  upload: createApiResponseConfig(
    createApiSuccess(
      'Files uploaded successfully',
      HttpStatus.CREATED,
      undefined,
      FileResponseDto,
    ),
    [
      createApiError(
        AppErrorCode.VALIDATION_ERROR,
        'files.errors.file_too_large',
      ),
      createApiError(
        AppErrorCode.VALIDATION_ERROR,
        'files.errors.invalid_type',
      ),
      createApiError(AppErrorCode.INTERNAL_ERROR, 'files.errors.storage_error'),
    ],
  ),
  uploadMultiple: createApiResponseConfig(
    createApiSuccess(
      'Files uploaded successfully',
      HttpStatus.CREATED,
      undefined,
      [FileResponseDto],
    ),
    [
      createApiError(
        AppErrorCode.VALIDATION_ERROR,
        'files.errors.file_too_large',
      ),
      createApiError(
        AppErrorCode.VALIDATION_ERROR,
        'files.errors.invalid_type',
      ),
      createApiError(AppErrorCode.INTERNAL_ERROR, 'files.errors.storage_error'),
    ],
  ),
  getMeta: createApiResponseConfig(
    createApiSuccess(
      'File metadata retrieved successfully',
      HttpStatus.OK,
      undefined,
      FileResponseDto,
    ),
    [createApiError(AppErrorCode.NOT_FOUND, 'files.errors.not_found')],
  ),
  download: createApiResponseConfig(
    {
      status: HttpStatus.FOUND,
      message: 'Redirect to signed URL',
    },
    [
      createApiError(AppErrorCode.NOT_FOUND, 'files.errors.not_found'),
      createApiError(AppErrorCode.FORBIDDEN, 'files.errors.access_denied'),
    ],
  ),
  setVisibility: createApiResponseConfig(
    createApiSuccess(
      'File visibility updated',
      HttpStatus.OK,
      undefined,
      FileResponseDto,
    ),
    [createApiError(AppErrorCode.NOT_FOUND, 'files.errors.not_found')],
  ),
} as const satisfies Record<string, ApiResponseConfig>;
