import { createStrictZodDto } from '#src/infrastructure/validation/strict-zod-dto.js';
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

  @ApiProperty({ nullable: true })
  streamUrl?: string;
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
