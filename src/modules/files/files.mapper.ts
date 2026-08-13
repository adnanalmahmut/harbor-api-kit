import type { FileEntity } from './file.entity.js';

/**
 * Every route shape a file is addressed by, in one place.
 *
 * The local driver returns a relative marker (`/local/{storageKey}`) instead of
 * a signed URL, so the two `normalize*` helpers rewrite it to the endpoint that
 * actually serves bytes and leave absolute S3 presigned URLs untouched. The
 * mapper builds the same route strings for the response body — keeping them
 * apart meant `/api/v1/files/...` was spelled out in two files that had to
 * agree.
 */

export interface FileResponse {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string | null;
  size: number | null;
  isPublic: boolean;
  createdAt: Date;
  downloadUrl: string;
  publicUrl?: string;
}

export function isLocalDriverUrl(url: string): boolean {
  return url.startsWith('/local/');
}

export function normalizeDownloadUrl(url: string, fileId: string): string {
  // Points at the stream endpoint, NOT the download-url endpoint — the latter
  // returns JSON metadata and would create a self-referential loop.
  return isLocalDriverUrl(url) ? `/api/v1/files/${fileId}/stream` : url;
}

export function normalizePublicUrl(url: string, publicToken: string): string {
  return isLocalDriverUrl(url)
    ? `/api/v1/public/files/${publicToken}/stream`
    : url;
}

export function toFileResponse(file: FileEntity, appUrl: string): FileResponse {
  const baseUrl = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl;
  return {
    id: file.id,
    fileName: file.fileName,
    originalName: file.originalName,
    mimeType: file.mimeType,
    size: file.size ? Number(file.size) : null,
    isPublic: file.isPublic,
    createdAt: file.createdAt,
    downloadUrl: `${baseUrl}/api/v1/files/${file.id}/download`,
    publicUrl:
      file.isPublic && file.publicToken
        ? `${baseUrl}/api/v1/public/files/${file.publicToken}`
        : undefined,
  };
}
