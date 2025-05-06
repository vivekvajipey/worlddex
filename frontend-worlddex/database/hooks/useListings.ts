import { useState, useEffect, useCallback } from "react";
import { supabase, Tables } from "../supabase-client";
import { Listing } from "../types";

// Data access functions
export const fetchListings = async (
  filters?: {
    sellerId?: string;
    listingType?: "auction" | "buy-now" | "trade";
    status?: "active" | "completed" | "canceled" | "expired";
  },
  pagination?: { page: number; pageSize: number }
): Promise<{ data: Listing[]; count: number } | null> => {
  let query = supabase.from(Tables.LISTINGS).select(
    `
      *,
      listing_items (
        captures (*)
      )
    `,
    { count: "exact" }
  );

  // Apply filters
  if (filters?.sellerId) {
    query = query.eq("seller_id", filters.sellerId);
  }
  if (filters?.listingType) {
    query = query.eq("listing_type", filters.listingType);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  // Apply pagination
  if (pagination) {
    const { page, pageSize } = pagination;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
  }

  // Order by newest first
  query = query.order("created_at", { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching listings:", error);
    return null;
  }

  // Transform the data to flatten the captures array
  const transformedData = data.map((listing) => ({
    ...listing,
    captures:
      listing.listing_items?.flatMap(
        (item: { captures: any[] }) => item.captures
      ) || [],
  }));

  return { data: transformedData, count: count || 0 };
};

export const fetchListingById = async (
  listingId: string
): Promise<Listing | null> => {
  const { data, error } = await supabase
    .from(Tables.LISTINGS)
    .select("*")
    .eq("id", listingId)
    .single();

  if (error) {
    console.error("Error fetching listing:", error);
    return null;
  }

  return data;
};

export const createListing = async (
  listing: Omit<Listing, "id" | "created_at" | "status" | "completed_at"> & {
    reserve_price?: number;
  }
): Promise<Listing | null> => {
  const insertData: any = { ...listing, status: "active" };
  if (listing.listing_type === "auction") {
    insertData.auction_type = "second-price";
    insertData.reserve_price = listing.reserve_price;
  }
  const { data, error } = await supabase
    .from(Tables.LISTINGS)
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("Error creating listing:", error);
    return null;
  }

  return data;
};

export const updateListing = async (
  listingId: string,
  updates: Partial<Listing>
): Promise<Listing | null> => {
  const { data, error } = await supabase
    .from(Tables.LISTINGS)
    .update(updates)
    .eq("id", listingId)
    .select()
    .single();

  if (error) {
    console.error("Error updating listing:", error);
    return null;
  }

  return data;
};

export const updateListingStatus = async (
  listingId: string,
  status: "active" | "completed" | "canceled" | "expired",
  completedAt?: string
): Promise<boolean> => {
  const updates: Partial<Listing> = { status };

  if (status === "completed" && completedAt) {
    updates.completed_at = completedAt;
  }

  const { error } = await supabase
    .from(Tables.LISTINGS)
    .update(updates)
    .eq("id", listingId);

  if (error) {
    console.error("Error updating listing status:", error);
    return false;
  }

  return true;
};

export const deleteListing = async (listingId: string): Promise<boolean> => {
  const { error } = await supabase
    .from(Tables.LISTINGS)
    .delete()
    .eq("id", listingId);

  if (error) {
    console.error("Error deleting listing:", error);
    return false;
  }

  return true;
};

export const useListings = (
  filters?: {
    sellerId?: string;
    listingType?: "auction" | "buy-now" | "trade";
    status?: "active" | "completed" | "canceled" | "expired";
  },
  pagination?: { page: number; pageSize: number }
) => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadListings = async () => {
      try {
        setLoading(true);

        // 1) batch‐finalize all expired auctions & listings via DB function
        const { error: batchError } = await supabase.rpc(
          "finalize_expired_listings"
        );
        if (batchError) console.error("Batch finalize failed:", batchError);

        // 2) fetch fresh listings
        const result = await fetchListings(filters, pagination);
        if (!isMounted || !result) return;

        setListings(result.data);
        setTotalCount(result.count);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        setError(
          err instanceof Error
            ? err
            : new Error("Unknown error fetching listings")
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadListings();

    return () => {
      isMounted = false;
    };
  }, [
    filters?.sellerId,
    filters?.listingType,
    filters?.status,
    pagination?.page,
    pagination?.pageSize,
    refreshTrigger,
  ]);

  return { listings, totalCount, loading, error, refresh };
};

// Hook for a single listing
export const useListing = (listingId: string | null) => {
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadListing = async () => {
      if (!listingId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await fetchListingById(listingId);

        if (isMounted) {
          setListing(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Unknown error fetching listing")
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadListing();

    return () => {
      isMounted = false;
    };
  }, [listingId]);

  const updateListingData = async (
    updates: Partial<Listing>
  ): Promise<boolean> => {
    if (!listingId) return false;

    try {
      const updated = await updateListing(listingId, updates);
      if (updated) {
        setListing(updated);
        return true;
      }
      return false;
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Unknown error updating listing")
      );
      return false;
    }
  };

  const changeStatus = async (
    status: "active" | "completed" | "canceled" | "expired",
    completedAt?: string
  ): Promise<boolean> => {
    if (!listingId) return false;

    try {
      const success = await updateListingStatus(listingId, status, completedAt);
      if (success && listing) {
        setListing({
          ...listing,
          status,
          ...(completedAt ? { completed_at: completedAt } : {}),
        });
      }
      return success;
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Unknown error updating listing status")
      );
      return false;
    }
  };

  return { listing, loading, error, updateListingData, changeStatus };
};
