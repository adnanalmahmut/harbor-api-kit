import { ApiResponses } from '#src/core/presentation/http/decorators/api-errors.decorator.js';
import { ResponseMessage } from '#src/core/presentation/http/decorators/response-message.decorator.js';
import { AuthGuard } from '#src/modules/auth/presentation/http/guards/auth.guard.js';
import { Permissions } from '#src/modules/rbac/presentation/http/decorators/permissions.decorator.js';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';

import { FilesException } from '#src/modules/files/application/exceptions/files.exception.js';
import { FileResponseMapper } from '#src/modules/files/application/mappers/file-response.mapper.js';
import { GetDownloadUrlUseCase } from '#src/modules/files/application/use-cases/get-download-url.use-case.js';
import { GetFileMetaUseCase } from '#src/modules/files/application/use-cases/get-file-meta.use-case.js';
import { SetVisibilityUseCase } from '#src/modules/files/application/use-cases/set-visibility.use-case.js';
import { UploadFileUseCase } from '#src/modules/files/application/use-cases/upload-file.use-case.js';
import { FILES_RESPONSES } from './api-responses.examples.js';
import {
  DownloadUrlDto,
  FileResponseDto,
  SetVisibilityDto,
  UploadFileDto,
  UploadFilesDto,
} from './dtos/files.dto.js';

import type { MultipartFile } from '@fastify/multipart';

interface FastifyMultipartRequest extends FastifyRequest {
  isMultipart: () => boolean;
  file: () => Promise<MultipartFile | undefined>;
}

interface RequestWithUser extends FastifyRequest {
  user?: {
    id: string;
    roles?: string[];
  };
}

@ApiTags('Files')
@ApiBearerAuth()
@Controller({ path: 'files', version: '1' })
export class FilesController {
  constructor(
    private readonly uploadFileUseCase: UploadFileUseCase,
    private readonly getDownloadUrlUseCase: GetDownloadUrlUseCase,
    private readonly getFileMetaUseCase: GetFileMetaUseCase,
    private readonly setVisibilityUseCase: SetVisibilityUseCase,
  ) {}

  @UseGuards(AuthGuard)
  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadFileDto })
  @ApiOperation({ summary: 'Upload a file (Streaming)' })
  @ApiResponses(FILES_RESPONSES.upload)
  @ResponseMessage('files.messages.upload_success')
  async upload(@Req() req: FastifyMultipartRequest): Promise<FileResponseDto> {
    if (!req.isMultipart()) {
      throw FilesException.invalidRequest('multipart_required');
    }

    let filePart: MultipartFile | undefined;
    let isPublic = false;

    // Iterate parts to find fields (must be before file) and the file itself
    for await (const part of req.parts()) {
      if ((part as any).file) {
        filePart = part as MultipartFile;
        break; // Stop parsing after finding the file to start streaming
      } else {
        if (part.fieldname === 'isPublic') {
          isPublic = String((part as any).value).toLowerCase() === 'true';
        }
      }
    }

    if (!filePart) {
      throw FilesException.invalidRequest('no_file_uploaded');
    }

    const file = await this.uploadFileUseCase.execute({
      file: filePart.file as any, // Cast to Readable
      fileName: filePart.filename,
      mimeType: filePart.mimetype,
      size: 0,
      uploadedById: req.user?.id,
      isPublic,
    });

    return FileResponseMapper.map(file);
  }

  @UseGuards(AuthGuard)
  @Post('upload/multiple')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadFilesDto })
  @ApiOperation({ summary: 'Upload multiple files (Streaming)' })
  @ResponseMessage('files.messages.upload_success')
  @ApiResponses(FILES_RESPONSES.uploadMultiple)
  async uploadMultiple(
    @Req() req: FastifyMultipartRequest,
  ): Promise<FileResponseDto[]> {
    if (!req.isMultipart()) {
      throw FilesException.invalidRequest('multipart_required');
    }

    const files = [];
    let isPublic = false;

    // Iterate parts to find fields (must be before file) and the file itself
    for await (const part of req.parts()) {
      if ((part as any).file) {
        const filePart = part as MultipartFile;
        const file = await this.uploadFileUseCase.execute({
          file: filePart.file as any, // Cast to Readable
          fileName: filePart.filename,
          mimeType: filePart.mimetype,
          size: 0,
          uploadedById: req.user?.id,
          isPublic,
        });
        files.push(file);
      } else {
        if (part.fieldname === 'isPublic') {
          isPublic = String((part as any).value).toLowerCase() === 'true';
        }
      }
    }

    if (files.length === 0) {
      throw FilesException.invalidRequest('no_file_uploaded');
    }

    return files.map((file) => FileResponseMapper.map(file));
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @Permissions(['files:read'])
  @ApiOperation({ summary: 'Get file metadata' })
  @ResponseMessage('files.messages.meta_retrieved')
  @ApiResponses(FILES_RESPONSES.getMeta)
  async getMeta(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<FileResponseDto> {
    const userId = req.user?.id;
    if (!userId) {
      throw FilesException.accessDenied();
    }
    const isAdmin = req.user?.roles?.includes('admin') ?? false;

    const file = await this.getFileMetaUseCase.execute(id, {
      actorUserId: userId,
      actorIsAdmin: isAdmin,
    });
    return FileResponseMapper.map(file);
  }

  @Get(':id/download')
  @UseGuards(AuthGuard)
  @Permissions(['files:read'])
  @ApiOperation({ summary: 'Get download URL (Redirect)' })
  @ApiResponses(FILES_RESPONSES.download)
  @ResponseMessage('files.messages.download_url_retrieved')
  async download(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<DownloadUrlDto> {
    const userId = req.user?.id;
    if (!userId) {
      throw FilesException.accessDenied();
    }
    const isAdmin = req.user?.roles?.includes('admin') ?? false;

    const result = await this.getDownloadUrlUseCase.execute(id, {
      actorUserId: userId,
      actorIsAdmin: isAdmin,
    });
    return { url: result.url, expiresIn: result.expiresIn };
  }

  @Patch(':id/visibility')
  @UseGuards(AuthGuard)
  @Permissions(['files:update'])
  @ApiOperation({ summary: 'Set file visibility' })
  @ResponseMessage('files.messages.visibility_updated')
  @ApiResponses(FILES_RESPONSES.setVisibility)
  async setVisibility(
    @Param('id') id: string,
    @Body() body: SetVisibilityDto,
    @Req() req: RequestWithUser,
  ): Promise<FileResponseDto> {
    const userId = req.user?.id;
    if (!userId) {
      throw FilesException.accessDenied();
    }
    const isAdmin = req.user?.roles?.includes('admin') ?? false;

    const file = await this.setVisibilityUseCase.execute(id, body.isPublic, {
      actorUserId: userId,
      actorIsAdmin: isAdmin,
    });
    return FileResponseMapper.map(file);
  }
}
