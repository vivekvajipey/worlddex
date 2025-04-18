import { API_URL } from "../config";
import { UploadUrlResponse, DownloadUrlResponse, DownloadUrlsRequest, DownloadUrlsResponse } from "../../../shared/types/photo";

export async function getUploadUrl(
  key: string,
  contentType: string
): Promise<UploadUrlResponse> {
  const res = await fetch(`${API_URL}/photos/upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, contentType }),
  });
  if (!res.ok) throw new Error(`Failed to get upload URL: ${res.statusText}`);
  return (await res.json()) as UploadUrlResponse;
}

export async function getDownloadUrl(
  key: string
): Promise<DownloadUrlResponse> {
  const res = await fetch(
    `${API_URL}/photos/${encodeURIComponent(key)}/download-url`
  );
  if (!res.ok) throw new Error(`Failed to get download URL: ${res.statusText}`);
  return (await res.json()) as DownloadUrlResponse;
}

/**
 * Batch: get presigned GET URLs for multiple keys
 */
export async function getDownloadUrls(
  keys: string[]
): Promise<DownloadUrlsResponse> {
  const res = await fetch(`${API_URL}/photos/download-urls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keys } as DownloadUrlsRequest),
  });
  if (!res.ok) throw new Error(`Failed to get download URLs: ${res.statusText}`);
  return (await res.json()) as DownloadUrlsResponse;
}
