export interface FileMetadata {
  key: string;
  contentType: string;
  size: number;
  lastModified: string;
  url?: string;
}

export interface UploadedFile extends FileMetadata {
  url: string; // URL is guaranteed after upload
}

// Used in API responses
export interface FileListResponse {
  files: FileMetadata[];
  nextCursor?: string;
} 