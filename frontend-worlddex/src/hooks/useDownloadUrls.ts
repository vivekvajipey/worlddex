import { useState, useEffect } from "react";
import { getDownloadUrls } from "../api/s3";
import type { DownloadUrlsResponse, DownloadUrlsResponseItem } from "../../../shared/types/photo";

/**
 * Hook to fetch presigned GET URLs for multiple S3 keys in batch
 */
export function useDownloadUrls(keys: string[]) {
  const [items, setItems] = useState<DownloadUrlsResponseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!keys || keys.length === 0) {
      setItems([]);
      return;
    }
    setLoading(true);
    getDownloadUrls(keys)
      .then((res: DownloadUrlsResponse) => {
        setItems(res);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => setLoading(false));
  }, [JSON.stringify(keys)]);

  return { items, loading, error };
}
