import {
  GetPublicFileAccessUseCase,
  StreamPublicFileUseCase,
} from '../application/index.js';
import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';

@ApiTags('Public Files')
@Controller({ path: 'public/files', version: '1' })
export class PublicFilesController {
  constructor(
    private readonly getPublicAccess: GetPublicFileAccessUseCase,
    private readonly streamPublicFile: StreamPublicFileUseCase,
  ) {}

  @Get(':token')
  @ApiOperation({ summary: 'Public file access (get URL or metadata)' })
  async getPublicFile(@Param('token') token: string) {
    const result = await this.getPublicAccess.execute(token);
    return { url: result.url, expiresIn: result.expiresIn };
  }

  @Get(':token/stream')
  @ApiOperation({ summary: 'Stream public file content (local storage)' })
  async streamPublic(
    @Param('token') token: string,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const result = await this.streamPublicFile.execute(token);

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

  @Get(':token/meta')
  @ApiOperation({ summary: 'Public file metadata (URL only)' })
  async getPublicFileMeta(@Param('token') token: string) {
    const result = await this.getPublicAccess.execute(token);
    return { url: result.url };
  }
}
