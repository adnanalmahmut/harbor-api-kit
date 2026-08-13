import {
  createApiError,
  type ApiResponseConfig,
} from '#src/common/api-errors.decorator.js';
import { AppErrorCode } from '#src/common/app-exception.js';
import { createStrictZodDto } from '#src/common/validation.pipe.js';
import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

export class FileResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  fileName!: string;

  @ApiProperty()
  originalName!: string;

  @ApiProperty()
  mimeType!: string | null;

  @ApiProperty({ description: 'File size in bytes' })
  size!: number | null;

  @ApiProperty()
  isPublic!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ nullable: true })
  publicUrl?: string;

  @ApiProperty({ nullable: true })
  downloadUrl?: string;
}

export class DownloadUrlDto {
  @ApiProperty()
  url!: string;

  @ApiProperty({ required: false })
  expiresIn?: number;
}

const SetVisibilitySchema = z.object({
  isPublic: z.boolean(),
});

export class SetVisibilityDto extends createStrictZodDto(SetVisibilitySchema) {}

export class UploadFileDto {
  @ApiProperty({ required: false, default: false })
  isPublic?: boolean;

  @ApiProperty({ type: 'string', format: 'binary' })
  file!: any;
}

export class UploadFilesDto {
  @ApiProperty({ required: false, default: false })
  isPublic?: boolean;

  @ApiProperty({ type: 'array', items: { type: 'string', format: 'binary' } })
  files!: any[];
}

/**
 * The documented contract per endpoint. Error rows go through `createApiError`
 * because it derives the HTTP status from the error code; the success half is a
 * plain literal — there is nothing to derive.
 */
export const FILES_RESPONSES = {
  upload: {
    success: {
      status: HttpStatus.CREATED,
      message: 'Files uploaded successfully',
      type: FileResponseDto,
    },
    errors: [
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
  },
  uploadMultiple: {
    success: {
      status: HttpStatus.CREATED,
      message: 'Files uploaded successfully',
      type: [FileResponseDto],
    },
    errors: [
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
  },
  getMeta: {
    success: {
      status: HttpStatus.OK,
      message: 'File metadata retrieved successfully',
      type: FileResponseDto,
    },
    errors: [createApiError(AppErrorCode.NOT_FOUND, 'files.errors.not_found')],
  },
  download: {
    success: {
      status: HttpStatus.OK,
      message: 'Signed URL generated',
      type: DownloadUrlDto,
    },
    errors: [
      createApiError(AppErrorCode.NOT_FOUND, 'files.errors.not_found'),
      createApiError(AppErrorCode.FORBIDDEN, 'files.errors.access_denied'),
    ],
  },
  setVisibility: {
    success: {
      status: HttpStatus.OK,
      message: 'File visibility updated',
      type: FileResponseDto,
    },
    errors: [createApiError(AppErrorCode.NOT_FOUND, 'files.errors.not_found')],
  },
} as const satisfies Record<string, ApiResponseConfig>;
