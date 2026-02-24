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
