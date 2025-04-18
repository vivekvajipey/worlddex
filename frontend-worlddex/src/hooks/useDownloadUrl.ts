import { useState, useEffect } from "react";
import { getDownloadUrl } from "../api/s3";
import { DownloadUrlResponse } from "../../../shared/types/photo";

export function useDownloadUrl(key: string) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!key) {
      setDownloadUrl(null);
      return;
    }
    setLoading(true);
    getDownloadUrl(key)
      .then((res: DownloadUrlResponse) => {
        setDownloadUrl(res.downloadUrl);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [key]);

  return { downloadUrl, loading, error };
}
