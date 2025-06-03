import { useState, useEffect } from "react";
import { supabase, Tables } from "../supabase-client";
import { Collection } from "../types";

// Data access functions
export const fetchCollection = async (
  collectionId: string
): Promise<Collection | null> => {
  const { data, error } = await supabase
    .from(Tables.COLLECTIONS)
    .select("*")
    .eq("id", collectionId)
    .single();

  if (error) {
    console.error("Error fetching collection:", error);
    return null;
  }

  return data;
};

export const fetchAllCollections = async (
  limit: number = 10,
  featuredOnly: boolean = false
): Promise<Collection[]> => {
  let query = supabase
    .from(Tables.COLLECTIONS)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (featuredOnly) {
    query = query.eq("is_featured", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching collections:", error);
    return [];
  }

  return data || [];
};

export const fetchUserCollections = async (
  userId: string
): Promise<Collection[]> => {
  const { data, error } = await supabase
    .from(Tables.COLLECTIONS)
    .select("*")
    .eq("created_by", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user collections:", error);
    return [];
  }

  return data || [];
};

export const createCollection = async (
  collection: Omit<Collection, "id" | "created_at">
): Promise<Collection | null> => {
  const { data, error } = await supabase
    .from(Tables.COLLECTIONS)
    .insert(collection)
    .select()
    .single();

  if (error) {
    console.error("Error creating collection:", error);
    return null;
  }

  return data;
};

export const updateCollection = async (
  collectionId: string,
  updates: Partial<Collection>
): Promise<Collection | null> => {
  const { data, error } = await supabase
    .from(Tables.COLLECTIONS)
    .update(updates)
    .eq("id", collectionId)
    .select()
    .single();

  if (error) {
    console.error("Error updating collection:", error);
    return null;
  }

  return data;
};

export const deleteCollection = async (
  collectionId: string
): Promise<boolean> => {
  try {
    // Step 1: Delete all user_collection_items for this collection
    const { error: userItemsError } = await supabase
      .from(Tables.USER_COLLECTION_ITEMS)
      .delete()
      .eq("collection_id", collectionId);

    if (userItemsError) {
      console.error("Error deleting user collection items:", userItemsError);
      return false;
    }

    // Step 2: Delete all user_collections for this collection  
    const { error: userCollectionsError } = await supabase
      .from(Tables.USER_COLLECTIONS)
      .delete()
      .eq("collection_id", collectionId);

    if (userCollectionsError) {
      console.error("Error deleting user collections:", userCollectionsError);
      return false;
    }

    // Step 3: Delete all collection_items for this collection
    const { error: collectionItemsError } = await supabase
      .from(Tables.COLLECTION_ITEMS)
      .delete()
      .eq("collection_id", collectionId);

    if (collectionItemsError) {
      console.error("Error deleting collection items:", collectionItemsError);
      return false;
    }

    // Step 4: Finally delete the collection itself
    const { error: collectionError } = await supabase
    .from(Tables.COLLECTIONS)
    .delete()
    .eq("id", collectionId);

    if (collectionError) {
      console.error("Error deleting collection:", collectionError);
      return false;
    }

    console.log(`Successfully deleted collection ${collectionId} and all related records`);
    return true;
  } catch (error) {
    console.error("Unexpected error during collection deletion:", error);
    return false;
  }
};

// React hooks
export const useCollection = (collectionId: string | null) => {
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadCollection = async () => {
      if (!collectionId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await fetchCollection(collectionId);

        if (isMounted) {
          setCollection(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Unknown error fetching collection")
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCollection();

    return () => {
      isMounted = false;
    };
  }, [collectionId]);

  const updateCollectionData = async (
    updates: Partial<Collection>
  ): Promise<boolean> => {
    if (!collection || !collectionId) return false;

    try {
      const updated = await updateCollection(collectionId, updates);
      if (updated) {
        setCollection(updated);
        return true;
      }
      return false;
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Unknown error updating collection")
      );
      return false;
    }
  };

  return { collection, loading, error, updateCollection: updateCollectionData };
};

export const useCollections = (
  featuredOnly: boolean = false,
  limit: number = 10
) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadCollections = async () => {
      try {
        setLoading(true);
        const data = await fetchAllCollections(limit, featuredOnly);

        if (isMounted) {
          setCollections(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Unknown error fetching collections")
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCollections();

    return () => {
      isMounted = false;
    };
  }, [featuredOnly, limit]);

  return { collections, loading, error };
};

export const useUserCollections = (userId: string | null) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadUserCollections = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await fetchUserCollections(userId);

        if (isMounted) {
          setCollections(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Unknown error fetching user collections")
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadUserCollections();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  return { collections, loading, error };
};
