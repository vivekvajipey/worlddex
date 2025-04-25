import { useState, useEffect, useCallback } from 'react';
import { fetchCaptureComments } from '../../src/api/comments';

export const useCaptureComments = (
  captureId: string | null,
  { limit = 20, initialPage = 1 }: { limit?: number; initialPage?: number } = {}
) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [page, setPage]         = useState(initialPage);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<Error | null>(null);

  const load = useCallback(async (p = page) => {
    if (!captureId) return;
    setLoading(true);
    try {
      const { comments, count } = await fetchCaptureComments(captureId, {
        limit,
        page: p,
      });
      setComments(comments);
      setTotal(count);
      setPage(p);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [captureId, limit, page]);

  useEffect(() => { load(initialPage); }, [captureId]);

  return {
    comments,
    loading,
    error,
    page,
    pageCount: Math.ceil(total / limit),
    fetchPage: load,
    refresh: () => load(1),
  };
};
