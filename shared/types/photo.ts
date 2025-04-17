export interface PhotoUpload {
  base64Data: string;
  fileName: string;
  contentType: string; // e.g. "image/jpeg"
}

export interface PhotoUploadResponse {
  url: string;  // The S3 signed URL
  key: string;  // The S3 key/path where the photo is stored
}

export interface UploadUrlRequest { key: string; contentType: string }
export interface UploadUrlResponse { uploadUrl: string; key: string }
export interface DownloadUrlResponse { downloadUrl: string }

export interface DownloadUrlsRequest {
  keys: string[];
}
export interface DownloadUrlsResponseItem {
  key: string;
  downloadUrl: string;
}
export type DownloadUrlsResponse = DownloadUrlsResponseItem[];