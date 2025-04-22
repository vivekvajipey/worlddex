import { useState, useEffect, useRef } from "react";
import { getDownloadUrl } from "../api/s3";
import { DownloadUrlResponse } from "../../../shared/types/photo";

// Create a global cache to store download URLs across component instances
// This ensures we don't refetch URLs we've already loaded
const urlCache: Record<string, string> = {};

export function useDownloadUrl(key: string) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef(true);

  // Track if component is mounted to prevent setState after unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!key) {
      setDownloadUrl(null);
      return;
    }

    // If we already have this URL cached, use it immediately without loading state
    if (urlCache[key]) {
      setDownloadUrl(urlCache[key]);
      return;
    }

    // Otherwise, fetch the URL from the API
    setLoading(true);

    getDownloadUrl(key)
      .then((res: DownloadUrlResponse) => {
        if (isMounted.current) {
          // Store in cache for future use
          if (res.downloadUrl) {
            urlCache[key] = res.downloadUrl;
          }

          setDownloadUrl(res.downloadUrl);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      })
      .finally(() => {
        if (isMounted.current) {
          setLoading(false);
        }
      });
  }, [key]);

  return { downloadUrl, loading, error };
}
