import { GetPublicFileAccessUseCase } from '#src/modules/files/application/index.js';
import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Public Files')
@Controller({ path: 'public/files', version: '1' })
export class PublicFilesController {
  constructor(private readonly getPublicAccess: GetPublicFileAccessUseCase) {}

  @Get(':token')
  @ApiOperation({ summary: 'Public file access' })
  async getPublicFile(@Param('token') token: string) {
    const result = await this.getPublicAccess.execute(token);
    return { url: result.url, expiresIn: result.expiresIn };
  }

  @Get(':token/meta')
  @ApiOperation({ summary: 'Public file metadata (URL only)' })
  async getPublicFileMeta(@Param('token') token: string) {
    const result = await this.getPublicAccess.execute(token);
    return { url: result.url };
  }
}
