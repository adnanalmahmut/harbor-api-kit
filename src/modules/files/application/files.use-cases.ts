import { StorageDriver } from '../domain/index.js';
import crypto from 'node:crypto';
import path from 'node:path';
import { Readable } from 'node:stream';
import { FilesException } from './files.exception.js';
import type {
  FileValidatorPort,
  IFileRepository,
  IFilesConfig,
  IStorageDriver,
} from './files.ports.js';

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

const DOWNLOAD_URL_EXPIRES_IN = 900; // 15 minutes
const PUBLIC_URL_EXPIRES_IN = 300; // 5 minutes

type AccessibleFile = NonNullable<
  Awaited<ReturnType<IFileRepository['findAccessibleById']>>
>;

type PublicFile = NonNullable<
  Awaited<ReturnType<IFileRepository['findByPublicToken']>>
>;

async function getAccessibleFileOrThrow(
  repository: IFileRepository,
  id: string,
  actor: FilesActor,
): Promise<AccessibleFile> {
  const file = await repository.findAccessibleById(
    id,
    actor.actorUserId,
    actor.actorIsAdmin,
  );

  if (!file || file.isDeleted) {
    throw FilesException.notFound(id);
  }

  return file;
}

async function getPublicFileOrThrow(
  repository: IFileRepository,
  token: string,
): Promise<PublicFile> {
  const file = await repository.findByPublicToken(token);

  if (!file || !file.isPublic) {
    throw FilesException.notFound();
  }

  return file;
}

async function signReadUrl(
  storage: IStorageDriver,
  filePath: string,
  mimeType: string | null | undefined,
  expiresIn: number,
): Promise<string> {
  return storage.getSignedUrl(filePath, {
    action: 'read',
    expiresIn,
    contentType: mimeType || undefined,
  });
}

function isLocalDriverUrl(url: string): boolean {
  return url.startsWith('/local/');
}

function normalizeDownloadUrl(url: string, fileId: string): string {
  // Local driver returns a marker (/local/...). Rewrite to the file-stream
  // endpoint that serves binary content — NOT the download-url endpoint
  // (which returns JSON metadata and would create a self-referential loop).
  return isLocalDriverUrl(url) ? `/api/v1/files/${fileId}/stream` : url;
}

function normalizePublicUrl(url: string, publicToken: string): string {
  // Same pattern for public files — point to the public stream endpoint.
  return isLocalDriverUrl(url)
    ? `/api/v1/public/files/${publicToken}/stream`
    : url;
}

function mapDriverEnum(driver: string): StorageDriver {
  switch (driver) {
    case 'gcs':
      return StorageDriver.GCS;
    case 'local':
      return StorageDriver.LOCAL;
    default:
      return StorageDriver.S3_COMPAT;
  }
}

export class GetDownloadUrlUseCase {
  constructor(
    private readonly storage: IStorageDriver,
    private readonly repository: IFileRepository,
  ) {}

  async execute(
    id: string,
    actor: FilesActor,
  ): Promise<{ url: string; expiresIn?: number; isPublic: boolean }> {
    const file = await getAccessibleFileOrThrow(this.repository, id, actor);

    const url = await signReadUrl(
      this.storage,
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
}

export class GetFileMetaUseCase {
  constructor(private readonly repository: IFileRepository) {}

  async execute(id: string, actor: FilesActor) {
    return getAccessibleFileOrThrow(this.repository, id, actor);
  }
}

export class GetPublicFileAccessUseCase {
  constructor(
    private readonly repository: IFileRepository,
    private readonly storage: IStorageDriver,
  ) {}

  async execute(token: string): Promise<PublicUrlResult> {
    const file = await getPublicFileOrThrow(this.repository, token);

    const rawUrl = await signReadUrl(
      this.storage,
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
}

export class SetVisibilityUseCase {
  constructor(private readonly repository: IFileRepository) {}

  async execute(id: string, isPublic: boolean, actor: FilesActor) {
    const file = await getAccessibleFileOrThrow(this.repository, id, actor);

    // Only owner or admin can change visibility
    if (!actor.actorIsAdmin && file.uploadedById !== actor.actorUserId) {
      throw FilesException.accessDenied();
    }

    let token = file.publicToken;
    if (isPublic && !token) {
      token = crypto.randomUUID();
    }

    const updated = await this.repository.update(id, {
      isPublic,
      publicToken: token,
    });

    return updated;
  }
}

export class UploadFileUseCase {
  constructor(
    private readonly storage: IStorageDriver,
    private readonly repository: IFileRepository,
    private readonly config: IFilesConfig,
    private readonly validator: FileValidatorPort,
  ) {}

  async execute(command: UploadFileCommand) {
    const fileId = crypto.randomUUID();
    const extension = path.extname(command.fileName);

    // Secure Key: files/{year}/{month}/{uuid}{ext}
    const date = new Date();
    const key = `files/${date.getFullYear()}/${date.getMonth() + 1}/${fileId}${extension}`;

    try {
      // 0) Validate file signature (magic bytes)
      await this.validator.validate(
        command.file,
        command.fileName,
        command.mimeType,
      );

      // 1) Upload to storage (streaming)
      const uploadResult = await this.storage.uploadStream(key, command.file, {
        contentType: command.mimeType,
        contentLength: command.size,
      });

      // 2) Persist metadata
      const file = await this.repository.create({
        fileName: command.fileName,
        originalName: command.fileName,
        filePath: uploadResult.key,
        mimeType: command.mimeType,
        size: BigInt(uploadResult.size),
        driver: mapDriverEnum(this.config.driver),
        bucket: this.config.bucket ?? undefined,
        uploadedById: command.uploadedById,
        isPublic: command.isPublic ?? false,
        publicToken: command.isPublic ? crypto.randomUUID() : undefined,
      });

      return file;
    } catch (error) {
      if (error instanceof FilesException) {
        throw error;
      }

      throw FilesException.storageError(error);
    }
  }
}

// ---------------------------------------------------------------------------
// Stream file content (for local driver — S3/GCS use presigned URLs instead)
// ---------------------------------------------------------------------------

export interface StreamFileResult {
  stream: Readable;
  mimeType: string | null;
  size: bigint | null;
  fileName: string;
}

export class StreamFileUseCase {
  constructor(
    private readonly storage: IStorageDriver,
    private readonly repository: IFileRepository,
  ) {}

  async execute(id: string, actor: FilesActor): Promise<StreamFileResult> {
    const file = await getAccessibleFileOrThrow(this.repository, id, actor);

    const stream = await this.storage.getReadStream(file.filePath);

    return {
      stream,
      mimeType: file.mimeType,
      size: file.size,
      fileName: file.fileName,
    };
  }
}

export class StreamPublicFileUseCase {
  constructor(
    private readonly storage: IStorageDriver,
    private readonly repository: IFileRepository,
  ) {}

  async execute(token: string): Promise<StreamFileResult> {
    const file = await getPublicFileOrThrow(this.repository, token);

    const stream = await this.storage.getReadStream(file.filePath);

    return {
      stream,
      mimeType: file.mimeType,
      size: file.size,
      fileName: file.fileName,
    };
  }
}
