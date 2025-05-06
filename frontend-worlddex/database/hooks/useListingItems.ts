import { useState, useEffect } from "react";
import { supabase, Tables } from "../supabase-client";
import { ListingItem, Capture } from "../types";

// Data access functions
export const fetchListingItemsByListingId = async (
  listingId: string
): Promise<ListingItem[] | null> => {
  const { data, error } = await supabase
    .from(Tables.LISTING_ITEMS)
    .select("*")
    .eq("listing_id", listingId);

  if (error) {
    console.error("Error fetching listing items:", error);
    return null;
  }

  return data;
};

export const fetchListingItemsWithCaptures = async (
  listingId: string
): Promise<{ listingItem: ListingItem; capture: Capture }[] | null> => {
  const { data, error } = await supabase
    .from(Tables.LISTING_ITEMS)
    .select(
      `
      *,
      captures:${Tables.CAPTURES}(*)
    `
    )
    .eq("listing_id", listingId);

  if (error) {
    console.error("Error fetching listing items with captures:", error);
    return null;
  }

  return data.map((item: any) => ({
    listingItem: {
      id: item.id,
      listing_id: item.listing_id,
      capture_id: item.capture_id,
    },
    capture: item.captures,
  }));
};

export const addListingItem = async (
  listingItem: Omit<ListingItem, "id">
): Promise<ListingItem | null> => {
  const { data, error } = await supabase
    .from(Tables.LISTING_ITEMS)
    .insert(listingItem)
    .select()
    .single();

  if (error) {
    console.error("Error adding listing item:", error);
    return null;
  }

  return data;
};

export const removeListingItem = async (
  listingItemId: string
): Promise<boolean> => {
  const { error } = await supabase
    .from(Tables.LISTING_ITEMS)
    .delete()
    .eq("id", listingItemId);

  if (error) {
    console.error("Error removing listing item:", error);
    return false;
  }

  return true;
};

export const addMultipleListingItems = async (
  items: Omit<ListingItem, "id">[]
): Promise<ListingItem[] | null> => {
  const { data, error } = await supabase
    .from(Tables.LISTING_ITEMS)
    .insert(items)
    .select();

  if (error) {
    console.error("Error adding multiple listing items:", error);
    return null;
  }

  return data;
};

// React hook
export const useListingItems = (listingId: string | null) => {
  const [listingItems, setListingItems] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadListingItems = async () => {
      if (!listingId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await fetchListingItemsByListingId(listingId);

        if (isMounted) {
          setListingItems(data || []);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Unknown error fetching listing items")
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadListingItems();

    return () => {
      isMounted = false;
    };
  }, [listingId]);

  const addItem = async (captureId: string): Promise<ListingItem | null> => {
    if (!listingId) return null;

    try {
      const newItem = await addListingItem({
        listing_id: listingId,
        capture_id: captureId,
      });

      if (newItem) {
        setListingItems((prevItems) => [...prevItems, newItem]);
      }

      return newItem;
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Unknown error adding listing item")
      );
      return null;
    }
  };

  const removeItem = async (listingItemId: string): Promise<boolean> => {
    try {
      const success = await removeListingItem(listingItemId);

      if (success) {
        setListingItems((prevItems) =>
          prevItems.filter((item) => item.id !== listingItemId)
        );
      }

      return success;
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Unknown error removing listing item")
      );
      return false;
    }
  };

  const addMultipleItems = async (
    captureIds: string[]
  ): Promise<ListingItem[] | null> => {
    if (!listingId || captureIds.length === 0) return null;

    try {
      const items = captureIds.map((captureId) => ({
        listing_id: listingId,
        capture_id: captureId,
      }));

      const newItems = await addMultipleListingItems(items);

      if (newItems) {
        setListingItems((prevItems) => [...prevItems, ...newItems]);
      }

      return newItems;
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Unknown error adding multiple listing items")
      );
      return null;
    }
  };

  return {
    listingItems,
    loading,
    error,
    addItem,
    removeItem,
    addMultipleItems,
  };
};

// Hook for listing items with capture data
export const useListingItemsWithCaptures = (listingId: string | null) => {
  const [listingItemsWithCaptures, setListingItemsWithCaptures] = useState<
    { listingItem: ListingItem; capture: Capture }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadListingItemsWithCaptures = async () => {
      if (!listingId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await fetchListingItemsWithCaptures(listingId);

        if (isMounted) {
          setListingItemsWithCaptures(data || []);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Unknown error fetching listing items with captures")
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadListingItemsWithCaptures();

    return () => {
      isMounted = false;
    };
  }, [listingId]);

  return {
    listingItemsWithCaptures,
    loading,
    error,
  };
};
