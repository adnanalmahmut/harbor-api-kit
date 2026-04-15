import {
  ApiResponses,
  AppConfigService,
  ResponseMessage,
} from '#src/core/index.js';
import { AuthGuard } from '#src/modules/auth/index.js';
import {
  FileResponseMapper,
  FilesException,
  GetDownloadUrlUseCase,
  GetFileMetaUseCase,
  SetVisibilityUseCase,
  StreamFileUseCase,
  UploadFileUseCase,
} from '../application/index.js';
import { Permissions } from '#src/modules/rbac/index.js';
import { RbacGuard } from '#src/modules/rbac/index.js';
import type { MultipartFile } from '@fastify/multipart';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { FILES_RESPONSES } from './api-responses.examples.js';
import {
  DownloadUrlDto,
  FileResponseDto,
  SetVisibilityDto,
  UploadFileDto,
  UploadFilesDto,
} from './files.dto.js';

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
    private readonly streamFileUseCase: StreamFileUseCase,
    private readonly config: AppConfigService,
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
      // Size unknown at stream start; actual size is measured by the storage
      // driver after upload completes and stored from UploadResult.size.
      size: 0,
      uploadedById: req.user?.id,
      isPublic,
    });

    return FileResponseMapper.map(file, this.config.app().publicUrl);
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

    const publicUrl = this.config.app().publicUrl;
    return files.map((file) => FileResponseMapper.map(file, publicUrl));
  }

  @Get(':id')
  @UseGuards(AuthGuard, RbacGuard)
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
    return FileResponseMapper.map(file, this.config.app().publicUrl);
  }

  @Get(':id/download')
  @UseGuards(AuthGuard, RbacGuard)
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

  @Get(':id/stream')
  @UseGuards(AuthGuard, RbacGuard)
  @Permissions(['files:read'])
  @ApiOperation({ summary: 'Stream file content (local storage)' })
  async stream(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      throw FilesException.accessDenied();
    }
    const isAdmin = req.user?.roles?.includes('admin') ?? false;

    const result = await this.streamFileUseCase.execute(id, {
      actorUserId: userId,
      actorIsAdmin: isAdmin,
    });

    reply.header('Content-Type', result.mimeType || 'application/octet-stream');
    reply.header(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(result.fileName)}"`,
    );
    if (result.size != null) {
      reply.header('Content-Length', String(result.size));
    }

    await reply.send(result.stream);
  }

  @Patch(':id/visibility')
  @UseGuards(AuthGuard, RbacGuard)
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
    return FileResponseMapper.map(file, this.config.app().publicUrl);
  }
}
