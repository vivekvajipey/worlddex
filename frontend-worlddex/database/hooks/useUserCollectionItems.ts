import { useState, useEffect } from "react";
import { supabase, Tables } from "../supabase-client";
import { UserCollectionItem } from "../types";

// Data access functions
export const fetchUserCollectionItem = async (
  id: string
): Promise<UserCollectionItem | null> => {
  const { data, error } = await supabase
    .from(Tables.USER_COLLECTION_ITEMS)
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching user collection item:", error);
    return null;
  }

  return data;
};

export const fetchUserCollectionItems = async (
  userId: string
): Promise<UserCollectionItem[]> => {
  const { data, error } = await supabase
    .from(Tables.USER_COLLECTION_ITEMS)
    .select("*")
    .eq("user_id", userId)
    .order("collected_at", { ascending: false });

  if (error) {
    console.error("Error fetching user collection items:", error);
    return [];
  }

  return data || [];
};

export const fetchUserCollectionItemsWithDetails = async (userId: string) => {
  const { data, error } = await supabase
    .from(Tables.USER_COLLECTION_ITEMS)
    .select(
      `
      *,
      ${Tables.COLLECTION_ITEMS}(*),
      ${Tables.CAPTURES}(*)
    `
    )
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching user collection items with details:", error);
    return [];
  }

  return data || [];
};

export const fetchUserCollectionItemsByCollection = async (
  userId: string,
  collectionId: string
) => {
  const { data, error } = await supabase
    .from(Tables.USER_COLLECTION_ITEMS)
    .select(
      `
      *,
      ${Tables.COLLECTION_ITEMS}(*),
      ${Tables.CAPTURES}(*)
    `
    )
    .eq("user_id", userId)
    .eq("collection_id", collectionId);

  if (error) {
    console.error("Error fetching user collection items by collection:", error);
    return [];
  }

  return data || [];
};

export const createUserCollectionItem = async (
  item: Omit<UserCollectionItem, "id" | "collected_at">
): Promise<UserCollectionItem | null> => {
  const { data, error } = await supabase
    .from(Tables.USER_COLLECTION_ITEMS)
    .insert(item)
    .select()
    .single();

  if (error) {
    console.error("Error creating user collection item:", error);
    return null;
  }

  return data;
};

export const deleteUserCollectionItem = async (
  id: string
): Promise<boolean> => {
  const { error } = await supabase
    .from(Tables.USER_COLLECTION_ITEMS)
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting user collection item:", error);
    return false;
  }

  return true;
};

export const checkUserHasCollectionItem = async (
  userId: string,
  collectionItemId: string
): Promise<boolean> => {
  const { data, error } = await supabase
    .from(Tables.USER_COLLECTION_ITEMS)
    .select("id")
    .eq("user_id", userId)
    .eq("collection_item_id", collectionItemId)
    .limit(1);

  if (error) {
    console.error("Error checking if user has collection item:", error);
    return false;
  }

  return data && data.length > 0;
};

export const countUserCollectionItemsByCollection = async (
  userId: string,
  collectionId: string
): Promise<number> => {
  const { count, error } = await supabase
    .from(Tables.USER_COLLECTION_ITEMS)
    .select("id", { count: "exact" })
    .eq("user_id", userId)
    .eq("collection_id", collectionId);

  if (error) {
    console.error("Error counting user collection items by collection:", error);
    return 0;
  }

  return count || 0;
};

// React hooks
export const useUserCollectionItems = (userId: string | null) => {
  const [items, setItems] = useState<UserCollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadItems = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await fetchUserCollectionItems(userId);

        if (isMounted) {
          setItems(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Unknown error fetching user collection items")
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadItems();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const addItem = async (
    collectionItemId: string,
    captureId: string,
    collectionId: string
  ): Promise<boolean> => {
    if (!userId) return false;

    try {
      const newItem = await createUserCollectionItem({
        user_id: userId,
        collection_item_id: collectionItemId,
        capture_id: captureId,
        collection_id: collectionId,
      });

      if (newItem) {
        setItems((prev) => [...prev, newItem]);
        return true;
      }
      return false;
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Unknown error adding item to collection")
      );
      return false;
    }
  };

  const removeItem = async (itemId: string): Promise<boolean> => {
    try {
      const success = await deleteUserCollectionItem(itemId);

      if (success) {
        setItems((prev) => prev.filter((item) => item.id !== itemId));
        return true;
      }
      return false;
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Unknown error removing item from collection")
      );
      return false;
    }
  };

  return { items, loading, error, addItem, removeItem };
};

export const useUserCollectionItemsByCollection = (
  userId: string | null,
  collectionId: string | null
) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadItems = async () => {
      if (!userId || !collectionId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await fetchUserCollectionItemsByCollection(
          userId,
          collectionId
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
              : new Error(
                  "Unknown error fetching user collection items by collection"
                )
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadItems();

    return () => {
      isMounted = false;
    };
  }, [userId, collectionId]);

  return { items, loading, error };
};
