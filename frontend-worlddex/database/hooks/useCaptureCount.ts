import { useState, useEffect, useCallback } from "react";
import { supabase, Tables } from "../supabase-client";

// Function to get the total number of captures for a user
export const fetchCaptureCount = async (userId: string): Promise<number> => {
  if (!userId) return 0;

  try {
    const { count, error } = await supabase
      .from(Tables.CAPTURES)
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching capture count:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("Error in fetchCaptureCount:", error);
    return 0;
  }
};

// React hook to get and monitor the total captures
export const useCaptureCount = (userId: string | null) => {
  const [totalCaptures, setTotalCaptures] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshCaptureCount = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const count = await fetchCaptureCount(userId);
      setTotalCaptures(count);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Unknown error fetching captures")
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    let isMounted = true;

    const fetchCaptures = async () => {
      if (!userId) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const count = await fetchCaptureCount(userId);

        if (isMounted) {
          setTotalCaptures(count);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Unknown error fetching captures")
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchCaptures();

    // Listen for changes to the captures table for this user
    const subscription = supabase
      .channel("captures_count_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: Tables.CAPTURES,
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchCaptures();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [userId]);

  return { totalCaptures, loading, error, refreshCaptureCount };
};
