import { useState, useCallback, useEffect } from 'react';

export interface PaginationConfig {
  limit: number;
  initialPage?: number;
  autoFetch?: boolean;
}

export interface PaginationState<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  page: number;
  totalCount: number;
  hasMore: boolean;
  pageCount: number;
}

export interface PaginationResult<T> extends PaginationState<T> {
  fetchNextPage: () => void;
  fetchPreviousPage: () => void;
  refreshData: () => void;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
}

export interface PaginationFetcher<T> {
  (page: number, limit: number): Promise<PaginatedResponse<T>>;
}

export const usePaginationState = <T>(
  fetcher: PaginationFetcher<T>,
  config: PaginationConfig,
  deps: any[] = []
): PaginationResult<T> => {
  const { limit, initialPage = 1, autoFetch = true } = config;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(initialPage);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const pageCount = Math.ceil(totalCount / limit);

  const fetchData = useCallback(
    async (pageToFetch: number = page, resetData: boolean = false) => {
      setLoading(true);
      setError(null);

      try {
        const result = await fetcher(pageToFetch, limit);

        setData(prev => {
          if (resetData || pageToFetch === 1) {
            return result.data;
          }
          
          // For infinite scroll - deduplicate and append
          const existingIds = new Set(prev.map((item: any) => 
            item.id ?? item.image_key ?? item.key
          ));
          const newItems = result.data.filter((item: any) => 
            !existingIds.has(item.id ?? item.image_key ?? item.key)
          );
          
          return [...prev, ...newItems];
        });
        
        setTotalCount(result.count);
        setHasMore(pageToFetch * limit < result.count);
        setPage(pageToFetch);
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Unknown error fetching data")
        );
      } finally {
        setLoading(false);
      }
    },
    [fetcher, limit, page, ...deps]
  );

  const fetchNextPage = useCallback(() => {
    if (!loading && hasMore) {
      fetchData(page + 1);
    }
  }, [fetchData, loading, hasMore, page]);

  const fetchPreviousPage = useCallback(() => {
    if (!loading && page > 1) {
      fetchData(page - 1);
    }
  }, [fetchData, loading, page]);

  const refreshData = useCallback(() => {
    fetchData(1, true);
  }, [fetchData]);

  // Load initial data
  useEffect(() => {
    if (autoFetch) {
      fetchData(initialPage, true);
    }
  }, [autoFetch, initialPage, ...deps]);

  return {
    data,
    loading,
    error,
    page,
    totalCount,
    hasMore,
    pageCount,
    fetchNextPage,
    fetchPreviousPage,
    refreshData,
  };
};