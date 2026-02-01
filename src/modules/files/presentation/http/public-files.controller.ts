import { FilesException } from '#src/modules/files/application/exceptions/files.exception.js';
import type { IFileRepository } from '#src/modules/files/application/ports/file.repository.port.js';
import type { IStorageDriver } from '#src/modules/files/application/ports/storage-driver.port.js';
import {
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';

@ApiTags('Public Files')
@Controller({ path: 'public/files', version: '1' })
export class PublicFilesController {
  constructor(
    @Inject('IFileRepository') private readonly repository: IFileRepository,
    @Inject('IStorageDriver') private readonly storage: IStorageDriver,
  ) {}

  @Get(':token')
  @ApiOperation({ summary: 'Public file access' })
  async getPublicFile(@Param('token') token: string, @Res() res: FastifyReply) {
    const file = await this.repository.findByPublicToken(token);

    if (!file || !file.isPublic) {
      // Don't reveal existence if not public/found
      throw FilesException.notFound(); // Map to 404
    }

    // 1. Get Signed URL or Path
    try {
      const urlOrPath = await this.storage.getSignedUrl(file.filePath, {
        action: 'read',
        expiresIn: 300, // 5 minutes
        contentType: file.mimeType || undefined,
      });

      // Check if it's a relative path (Local Driver proxy)
      // LocalDriver returns '/api/v1/files/:id/stream' usually,
      // BUT for public files we need to bypass auth.
      // If we redirect to /api/v1/files/... it will fail auth.
      // So we interpret it: if it starts with /, we stream manually.

      if (urlOrPath.startsWith('/')) {
        // Local driver returned a path (proxy).
        // We must stream directly here for public access to avoid AuthGuard.
        const stream = await this.storage.getReadStream(file.filePath);
        res.header('Content-Type', file.mimeType || 'application/octet-stream');
        res.header('Cache-Control', 'public, max-age=300');
        return res.send(stream);
      }

      // It is an absolute URL (S3/GCS), so redirect
      res.header('Cache-Control', 'public, max-age=300'); // 5 min cache
      return res.status(HttpStatus.FOUND).redirect(urlOrPath);
    } catch (e) {
      throw FilesException.storageError(e);
    }
  }
}
