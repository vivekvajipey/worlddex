import { useState, useEffect, useMemo } from "react";
import { getDownloadUrls } from "../api/s3";
import type { DownloadUrlsResponse, DownloadUrlsResponseItem } from "../../../shared/types/photo";

// Import the urlCache from useDownloadUrl to share the cache
import { urlCache } from "./useDownloadUrl";

/**
 * Hook to fetch presigned GET URLs for multiple S3 keys in batch
 */
export function useDownloadUrls(keys: string[]) {
  const [items, setItems] = useState<DownloadUrlsResponseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Filter out keys that are already in the cache
  const keysToFetch = useMemo(() => {
    if (!keys || keys.length === 0) return [];
    return keys.filter(key => !urlCache[key]);
  }, [keys]);

  // Combine cached items with newly fetched items
  const cachedItems = useMemo(() => {
    if (!keys || keys.length === 0) return [];
    return keys
      .filter(key => urlCache[key])
      .map(key => ({ key, downloadUrl: urlCache[key] }));
  }, [keys]);

  useEffect(() => {
    // If all keys are already cached, return them directly
    if (keysToFetch.length === 0 && cachedItems.length > 0) {
      setItems(cachedItems);
      return;
    }

    // If no keys to fetch, set items to empty
    if (!keysToFetch.length) {
      setItems([]);
      return;
    }

    setLoading(true);
    getDownloadUrls(keysToFetch)
      .then((res: DownloadUrlsResponse) => {
        // Store newly fetched URLs in the cache
        res.forEach(item => {
          if (item.key && item.downloadUrl) {
            urlCache[item.key] = item.downloadUrl;
          }
        });

        // Combine newly fetched items with cached items
        setItems([...cachedItems, ...res]);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => setLoading(false));
  }, [JSON.stringify(keysToFetch), cachedItems]);

  return { items, loading, error };
}
