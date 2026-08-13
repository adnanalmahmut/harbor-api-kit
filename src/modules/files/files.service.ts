import crypto from 'node:crypto';
import path from 'node:path';
import { Readable } from 'node:stream';
import { storageConfig } from '#src/config/index.js';
import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { StorageDriver, type FileEntity } from './file.entity.js';
import { FilesException } from './files.exception.js';
import { normalizeDownloadUrl, normalizePublicUrl } from './files.mapper.js';
import { FileRepository } from './files.repository.js';
import {
  FileValidatorPort,
  StorageDriverPort,
} from './storage/storage.port.js';

export type FilesActor = {
  actorUserId: string;
  actorIsAdmin: boolean;
};

export interface UploadFileCommand {
  file: Readable;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedById?: string;
  isPublic?: boolean;
}

export type PublicUrlResult = {
  url: string;
  expiresIn: number;
  mimeType?: string;
  isPublic: boolean;
};

export interface StreamFileResult {
  stream: Readable;
  mimeType: string | null;
  size: bigint | null;
  fileName: string;
}

const DOWNLOAD_URL_EXPIRES_IN = 900; // 15 minutes
const PUBLIC_URL_EXPIRES_IN = 300; // 5 minutes

/**
 * The configured provider, recorded faithfully on the row.
 *
 * `spaces` maps to S3_COMPAT because DigitalOcean Spaces is exactly that: a
 * generic S3-compatible endpoint with no behaviour of its own. AWS S3 and
 * Cloudflare R2 get their own values so an operator can tell where an object
 * lives without inspecting configuration that may since have changed.
 */
const DRIVER_BY_CONFIG = {
  local: StorageDriver.LOCAL,
  s3: StorageDriver.S3,
  r2: StorageDriver.R2,
  spaces: StorageDriver.S3_COMPAT,
} as const satisfies Record<
  ConfigType<typeof storageConfig>['driver'],
  StorageDriver
>;

@Injectable()
export class FilesService {
  constructor(
    private readonly repository: FileRepository,
    private readonly storage: StorageDriverPort,
    private readonly validator: FileValidatorPort,
    @Inject(storageConfig.KEY)
    private readonly config: ConfigType<typeof storageConfig>,
  ) {}

  async upload(command: UploadFileCommand): Promise<FileEntity> {
    const fileId = crypto.randomUUID();
    const extension = path.extname(command.fileName);

    // Secure key: files/{year}/{month}/{uuid}{ext}
    const date = new Date();
    const key = `files/${date.getFullYear()}/${date.getMonth() + 1}/${fileId}${extension}`;

    try {
      await this.validator.validate(
        command.file,
        command.fileName,
        command.mimeType,
      );

      const uploadResult = await this.storage.uploadStream(key, command.file, {
        contentType: command.mimeType,
        contentLength: command.size,
      });

      return await this.repository.create({
        fileName: command.fileName,
        originalName: command.fileName,
        filePath: uploadResult.key,
        mimeType: command.mimeType,
        size: BigInt(uploadResult.size),
        driver: DRIVER_BY_CONFIG[this.config.driver],
        bucket: this.bucket(),
        uploadedById: command.uploadedById,
        isPublic: command.isPublic ?? false,
        publicToken: command.isPublic ? crypto.randomUUID() : undefined,
      });
    } catch (error) {
      if (error instanceof FilesException) throw error;

      throw FilesException.storageError(error);
    }
  }

  async getMeta(id: string, actor: FilesActor): Promise<FileEntity> {
    return this.getAccessibleOrThrow(id, actor);
  }

  async getDownloadUrl(
    id: string,
    actor: FilesActor,
  ): Promise<{ url: string; expiresIn: number; isPublic: boolean }> {
    const file = await this.getAccessibleOrThrow(id, actor);

    const url = await this.signReadUrl(
      file.filePath,
      file.mimeType,
      DOWNLOAD_URL_EXPIRES_IN,
    );

    return {
      url: normalizeDownloadUrl(url, file.id),
      expiresIn: DOWNLOAD_URL_EXPIRES_IN,
      isPublic: file.isPublic,
    };
  }

  async setVisibility(
    id: string,
    isPublic: boolean,
    actor: FilesActor,
  ): Promise<FileEntity> {
    const file = await this.getAccessibleOrThrow(id, actor);

    // Only the owner or an admin may change visibility.
    if (!actor.actorIsAdmin && file.uploadedById !== actor.actorUserId) {
      throw FilesException.accessDenied();
    }

    let token = file.publicToken;
    if (isPublic && !token) token = crypto.randomUUID();

    return this.repository.update(id, { isPublic, publicToken: token });
  }

  async stream(id: string, actor: FilesActor): Promise<StreamFileResult> {
    const file = await this.getAccessibleOrThrow(id, actor);

    return this.toStreamResult(file);
  }

  async getPublicAccess(token: string): Promise<PublicUrlResult> {
    const file = await this.getPublicOrThrow(token);

    const rawUrl = await this.signReadUrl(
      file.filePath,
      file.mimeType,
      PUBLIC_URL_EXPIRES_IN,
    );

    return {
      url: normalizePublicUrl(rawUrl, token),
      expiresIn: PUBLIC_URL_EXPIRES_IN,
      mimeType: file.mimeType || undefined,
      isPublic: true,
    };
  }

  async streamPublic(token: string): Promise<StreamFileResult> {
    const file = await this.getPublicOrThrow(token);

    return this.toStreamResult(file);
  }

  private bucket(): string | undefined {
    return this.config.driver === 'local' ? undefined : this.config.s3.bucket;
  }

  private async getAccessibleOrThrow(
    id: string,
    actor: FilesActor,
  ): Promise<FileEntity> {
    const file = await this.repository.findAccessibleById(
      id,
      actor.actorUserId,
      actor.actorIsAdmin,
    );

    if (!file || file.isDeleted) throw FilesException.notFound(id);

    return file;
  }

  private async getPublicOrThrow(token: string): Promise<FileEntity> {
    const file = await this.repository.findByPublicToken(token);

    if (!file || !file.isPublic) throw FilesException.notFound();

    return file;
  }

  private async signReadUrl(
    filePath: string,
    mimeType: string | null | undefined,
    expiresIn: number,
  ): Promise<string> {
    return this.storage.getSignedUrl(filePath, {
      action: 'read',
      expiresIn,
      contentType: mimeType || undefined,
    });
  }

  private async toStreamResult(file: FileEntity): Promise<StreamFileResult> {
    return {
      stream: await this.storage.getReadStream(file.filePath),
      mimeType: file.mimeType,
      size: file.size,
      fileName: file.fileName,
    };
  }
}
