import { useState, useEffect, useCallback } from "react";
import { supabase, Tables } from "../supabase-client";
import { Capture } from "../types";

// Data access functions
export const fetchCapture = async (
  captureId: string
): Promise<Capture | null> => {
  const { data, error } = await supabase
    .from(Tables.CAPTURES)
    .select("*")
    .eq("id", captureId)
    .is("deleted_at", null)  // Exclude soft deleted captures
    .single();

  if (error) {
    console.error("Error fetching capture:", error);
    return null;
  }

  return data;
};

export const fetchUserCaptures = async (
  userId: string,
  limit: number = 20
): Promise<Capture[]> => {
  const { data, error } = await supabase
    .from(Tables.CAPTURES)
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)  // Exclude soft deleted captures
    .order("captured_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching user captures:", error);
    return [];
  }

  return data || [];
};

export const fetchItemCaptures = async (
  itemId: string,
  limit: number = 20
): Promise<Capture[]> => {
  const { data, error } = await supabase
    .from(Tables.CAPTURES)
    .select("*")
    .eq("item_id", itemId)
    .is("deleted_at", null)  // Exclude soft deleted captures
    .order("captured_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching item captures:", error);
    return [];
  }

  return data || [];
};

export const createCapture = async (
  capture: Omit<Capture, "id" | "captured_at">,
  capturedAt?: string // Optional timestamp for offline captures
): Promise<Capture | null> => {
  const insertData: any = { ...capture };
  
  // If capturedAt is provided, include it in the insert
  if (capturedAt) {
    insertData.captured_at = capturedAt;
  }
  
  const { data, error } = await supabase
    .from(Tables.CAPTURES)
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("Error creating capture:", error);
    return null;
  }

  return data;
};

export const updateCapture = async (
  captureId: string,
  updates: Partial<Capture>
): Promise<Capture | null> => {
  const { data, error } = await supabase
    .from(Tables.CAPTURES)
    .update(updates)
    .eq("id", captureId)
    .select()
    .single();

  if (error) {
    console.error("Error updating capture:", error);
    return null;
  }

  return data;
};

export const deleteCapture = async (captureId: string): Promise<boolean> => {
  // Soft delete by setting deleted_at timestamp
  const { data, error } = await supabase
    .from(Tables.CAPTURES)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", captureId)
    .select();

  if (error) {
    console.error("Error soft deleting capture:", error);
    return false;
  }

  // Check if any rows were actually updated
  console.log("Soft delete operation result:", { data, captureId });
  
  // If no data returned, no rows were updated
  if (!data || data.length === 0) {
    console.error("No capture was soft deleted - possible RLS policy issue");
    return false;
  }
  
  return true;
};

/**
 * Fetches top public captures sorted by total upvotes with pagination
 */
export const fetchTopCaptures = async (
  options: {
    limit?: number;
    page?: number;
    minUpvotes?: number;
    itemId?: string;
  } = {}
): Promise<{
  captures: Capture[];
  count: number;
}> => {
  const { limit = 10, page = 1, minUpvotes = 0, itemId } = options;

  // Calculate offset based on page and limit
  const offset = (page - 1) * limit;

  let query = supabase
    .from(Tables.CAPTURES)
    .select("*", { count: "exact" })
    .eq("is_public", true)
    .is("deleted_at", null)  // Exclude soft deleted captures
    .gte("like_count", minUpvotes)
    .order("captured_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Add optional filter by item_id
  if (itemId) {
    query = query.eq("item_id", itemId);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching top captures:", error);
    return { captures: [], count: 0 };
  }

  return {
    captures: data || [],
    count: count || 0,
  };
};

/**
 * React hook for paginated top captures
 */
export const useTopCaptures = (
  options: {
    limit?: number;
    initialPage?: number;
    minUpvotes?: number;
    itemId?: string;
    autoFetch?: boolean;
  } = {}
) => {
  const {
    limit = 10,
    initialPage = 1,
    minUpvotes = 0,
    itemId,
    autoFetch = true,
  } = options;

  const [captures, setCaptures] = useState<Capture[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(initialPage);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchCaptures = useCallback(
    async (pageToFetch: number = page) => {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchTopCaptures({
          limit,
          page: pageToFetch,
          minUpvotes,
          itemId,
        });

        setCaptures(prev => {
          const seen = new Set(prev.map(c => c.id ?? c.image_key));
          const deduped = result.captures.filter(c =>
            !seen.has(c.id ?? c.image_key)
          );
          return pageToFetch === 1 ? result.captures : [...prev, ...deduped];
        });
        
        setTotalCount(result.count);
        setHasMore(pageToFetch * limit < result.count);
        setPage(pageToFetch);
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Unknown error fetching top captures")
        );
      } finally {
        setLoading(false);
      }
    },
    [limit, minUpvotes, itemId, page]
  );

  const fetchNextPage = useCallback(() => {
    if (!loading && hasMore) {
      fetchCaptures(page + 1);
    }
  }, [fetchCaptures, loading, hasMore, page]);

  const fetchPreviousPage = useCallback(() => {
    if (!loading && page > 1) {
      fetchCaptures(page - 1);
    }
  }, [fetchCaptures, loading, page]);

  const refreshData = useCallback(() => {
    fetchCaptures(1);
  }, [fetchCaptures]);

  // Load initial data
  useEffect(() => {
    if (autoFetch) {
      fetchCaptures(initialPage);
    }
  }, [autoFetch, initialPage]);

  return {
    captures,
    loading,
    error,
    page,
    totalCount,
    hasMore,
    pageCount: Math.ceil(totalCount / limit),
    fetchCaptures,
    fetchNextPage,
    fetchPreviousPage,
    refreshData,
  };
};

// React hooks
export const useCapture = (captureId: string | null) => {
  const [capture, setCapture] = useState<Capture | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadCapture = async () => {
      if (!captureId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await fetchCapture(captureId);

        if (isMounted) {
          setCapture(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Unknown error fetching capture")
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCapture();

    return () => {
      isMounted = false;
    };
  }, [captureId]);

  const updateCaptureData = async (
    updates: Partial<Capture>
  ): Promise<boolean> => {
    if (!capture || !captureId) return false;

    try {
      const updated = await updateCapture(captureId, updates);
      if (updated) {
        setCapture(updated);
        return true;
      }
      return false;
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Unknown error updating capture")
      );
      return false;
    }
  };

  return { capture, loading, error, updateCapture: updateCaptureData };
};

export const useUserCaptures = (userId: string | null, limit: number = 100) => {
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadCaptures = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await fetchUserCaptures(userId, limit);

        if (isMounted) {
          setCaptures(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Unknown error fetching user captures")
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCaptures();

    return () => {
      isMounted = false;
    };
  }, [userId, limit]);

  return { captures, loading, error };
};

export const useItemCaptures = (itemId: string | null, limit: number = 20) => {
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadCaptures = async () => {
      if (!itemId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await fetchItemCaptures(itemId, limit);

        if (isMounted) {
          setCaptures(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Unknown error fetching item captures")
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCaptures();

    return () => {
      isMounted = false;
    };
  }, [itemId, limit]);

  return { captures, loading, error };
};
