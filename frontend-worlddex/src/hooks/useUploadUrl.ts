import { useState, useEffect } from "react";
import { getUploadUrl } from "../api/s3";
import { UploadUrlResponse } from "../../../shared/types/photo";

export function useUploadUrl(key: string, contentType: string) {
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!key || !contentType) {
      setUploadUrl(null);
      return;
    }
    setLoading(true);
    getUploadUrl(key, contentType)
      .then((res: UploadUrlResponse) => {
        setUploadUrl(res.uploadUrl);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => setLoading(false));
  }, [key, contentType]);

  return { uploadUrl, loading, error };
}
