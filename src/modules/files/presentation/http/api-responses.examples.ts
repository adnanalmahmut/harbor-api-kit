import {
  type ApiResponseConfig,
  AppErrorCode,
  createApiError,
  createApiResponseConfig,
  createApiSuccess,
} from '#src/core/index.js';
import { HttpStatus } from '@nestjs/common';
import { DownloadUrlDto, FileResponseDto } from './dtos/files.dto.js';

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
    createApiSuccess(
      'Signed URL generated',
      HttpStatus.OK,
      undefined,
      DownloadUrlDto,
    ),
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
