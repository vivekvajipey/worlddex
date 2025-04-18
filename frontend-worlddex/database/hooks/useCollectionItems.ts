import { useState, useEffect } from "react";
import { supabase, Tables } from "../supabase-client";
import { CollectionItem, AllItem, Collection } from "../types";

// Data access functions
export const fetchCollectionItem = async (
  itemId: string
): Promise<CollectionItem | null> => {
  const { data, error } = await supabase
    .from(Tables.COLLECTION_ITEMS)
    .select("*")
    .eq("id", itemId)
    .single();

  if (error) {
    console.error("Error fetching collection item:", error);
    return null;
  }

  return data;
};

export const fetchCollectionItems = async (
  collectionId: string
): Promise<CollectionItem[]> => {
  const { data, error } = await supabase
    .from(Tables.COLLECTION_ITEMS)
    .select("*")
    .eq("collection_id", collectionId);

  if (error) {
    console.error("Error fetching collection items:", error);
    return [];
  }

  return data || [];
};

export const fetchCollectionItemsWithDetails = async (collectionId: string) => {
  const { data, error } = await supabase
    .from(Tables.COLLECTION_ITEMS)
    .select(
      `
      *,
      ${Tables.ALL_ITEMS}(*)
    `
    )
    .eq("collection_id", collectionId);

  if (error) {
    console.error("Error fetching collection items with details:", error);
    return [];
  }

  return data || [];
};

export const fetchNearbyCollectionItems = async (
  lat: number,
  lng: number,
  radiusInMeters: number = 1000,
  limit: number = 10
) => {
  // ST_DWithin is used to find points within a certain distance
  const { data, error } = await supabase.rpc("nearby_collection_items", {
    latitude: lat,
    longitude: lng,
    radius_meters: radiusInMeters,
    limit_num: limit,
  });

  if (error) {
    console.error("Error fetching nearby collection items:", error);
    return [];
  }

  return data || [];
};

export const createCollectionItem = async (
  item: Omit<CollectionItem, "id" | "created_at">
): Promise<CollectionItem | null> => {
  const { data, error } = await supabase
    .from(Tables.COLLECTION_ITEMS)
    .insert(item)
    .select()
    .single();

  if (error) {
    console.error("Error creating collection item:", error);
    return null;
  }

  return data;
};

export const updateCollectionItem = async (
  itemId: string,
  updates: Partial<CollectionItem>
): Promise<CollectionItem | null> => {
  const { data, error } = await supabase
    .from(Tables.COLLECTION_ITEMS)
    .update(updates)
    .eq("id", itemId)
    .select()
    .single();

  if (error) {
    console.error("Error updating collection item:", error);
    return null;
  }

  return data;
};

export const deleteCollectionItem = async (
  itemId: string
): Promise<boolean> => {
  const { error } = await supabase
    .from(Tables.COLLECTION_ITEMS)
    .delete()
    .eq("id", itemId);

  if (error) {
    console.error("Error deleting collection item:", error);
    return false;
  }

  return true;
};

export const fetchCollectionItemsByCollectionId = async (
  collectionId: string
): Promise<CollectionItem[]> => {
  const { data, error } = await supabase
    .from(Tables.COLLECTION_ITEMS)
    .select("*")
    .eq("collection_id", collectionId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching collection items:", error);
    return [];
  }

  return data || [];
};

// React hooks
export const useCollectionItem = (itemId: string | null) => {
  const [item, setItem] = useState<CollectionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadItem = async () => {
      if (!itemId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await fetchCollectionItem(itemId);

        if (isMounted) {
          setItem(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Unknown error fetching collection item")
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadItem();

    return () => {
      isMounted = false;
    };
  }, [itemId]);

  const updateItem = async (
    updates: Partial<CollectionItem>
  ): Promise<boolean> => {
    if (!item || !itemId) return false;

    try {
      const updated = await updateCollectionItem(itemId, updates);
      if (updated) {
        setItem(updated);
        return true;
      }
      return false;
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Unknown error updating collection item")
      );
      return false;
    }
  };

  return { item, loading, error, updateItem };
};

export const useCollectionItems = (collectionId: string | null) => {
  const [collectionItems, setCollectionItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadCollectionItems = async () => {
      if (!collectionId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await fetchCollectionItemsByCollectionId(collectionId);

        if (isMounted) {
          setCollectionItems(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Unknown error fetching collection items")
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCollectionItems();

    return () => {
      isMounted = false;
    };
  }, [collectionId]);

  return { collectionItems, loading, error };
};

export const useNearbyCollectionItems = (
  latitude: number | null,
  longitude: number | null,
  radius: number = 1000,
  limit: number = 10
) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadNearbyItems = async () => {
      if (latitude === null || longitude === null) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await fetchNearbyCollectionItems(
          latitude,
          longitude,
          radius,
          limit
        );

        if (isMounted) {
          setItems(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Unknown error fetching nearby items")
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadNearbyItems();

    return () => {
      isMounted = false;
    };
  }, [latitude, longitude, radius, limit]);

  return { items, loading, error };
};
