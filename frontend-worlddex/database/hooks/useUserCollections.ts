import { useState, useEffect } from "react";
import { supabase, Tables } from "../supabase-client";
import { UserCollection } from "../types";

// Data access functions
export const fetchUserCollectionsByUser = async (
  userId: string
): Promise<UserCollection[]> => {
  const { data, error } = await supabase
    .from(Tables.USER_COLLECTIONS)
    .select("*")
    .eq("user_id", userId)
    .order("added_at", { ascending: false });

  if (error) {
    console.error("Error fetching user collections:", error);
    return [];
  }

  return data || [];
};

export const fetchUserCollection = async (
  userId: string,
  collectionId: string
): Promise<UserCollection | null> => {
  const { data, error } = await supabase
    .from(Tables.USER_COLLECTIONS)
    .select("*")
    .eq("user_id", userId)
    .eq("collection_id", collectionId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned - user doesn't have this collection
      return null;
    }
    console.error("Error fetching user collection:", error);
    return null;
  }

  return data;
};

export const addCollectionToUser = async (
  userId: string,
  collectionId: string
): Promise<UserCollection | null> => {
  const userCollection = {
    user_id: userId,
    collection_id: collectionId,
  };

  const { data, error } = await supabase
    .from(Tables.USER_COLLECTIONS)
    .insert(userCollection)
    .select()
    .single();

  if (error) {
    console.error("Error adding collection to user:", error);
    return null;
  }

  return data;
};

export const removeCollectionFromUser = async (
  userId: string,
  collectionId: string
): Promise<boolean> => {
  const { error } = await supabase
    .from(Tables.USER_COLLECTIONS)
    .delete()
    .eq("user_id", userId)
    .eq("collection_id", collectionId);

  if (error) {
    console.error("Error removing collection from user:", error);
    return false;
  }

  return true;
};

export const fetchActiveCollectionNames = async (
  userId: string
): Promise<string[]> => {
  const { data, error } = await supabase
    .from(Tables.USER_COLLECTIONS)
    .select("collections(name)")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    console.error("Error fetching active collections:", error);
    return [];
  }

  // Extract collection names from the joined data
  return (data || [])
    .map(item => {
      // The response shape is complex due to the join
      // @ts-ignore - We know the shape of the response
      return item.collections?.name as string | undefined;
    })
    .filter(Boolean) as string[];
};

export const fetchActiveCollectionIds = async (
  userId: string
): Promise<string[]> => {
  const { data, error } = await supabase
    .from(Tables.USER_COLLECTIONS)
    .select("collection_id")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    console.error("Error fetching active collection IDs:", error);
    return [];
  }

  // Extract collection IDs from the data
  return (data || []).map(item => item.collection_id);
};

export const setCollectionActive = async (
  userId: string,
  collectionId: string,
  isActive: boolean
): Promise<boolean> => {
  const { error } = await supabase
    .from(Tables.USER_COLLECTIONS)
    .update({ is_active: isActive })
    .eq("user_id", userId)
    .eq("collection_id", collectionId);

  if (error) {
    console.error(`Error ${isActive ? 'activating' : 'deactivating'} collection:`, error);
    return false;
  }

  return true;
};

// React hooks
export const useUserCollectionsList = (userId: string | null) => {
  const [userCollections, setUserCollections] = useState<UserCollection[]>([]);
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
        const data = await fetchUserCollectionsByUser(userId);

        if (isMounted) {
          setUserCollections(data);
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

  return { userCollections, loading, error };
};

export const useUserCollection = (
  userId: string | null,
  collectionId: string | null
) => {
  const [userCollection, setUserCollection] = useState<UserCollection | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadUserCollection = async () => {
      if (!userId || !collectionId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await fetchUserCollection(userId, collectionId);

        if (isMounted) {
          setUserCollection(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Unknown error fetching user collection")
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadUserCollection();

    return () => {
      isMounted = false;
    };
  }, [userId, collectionId]);

  const toggleCollection = async (): Promise<boolean> => {
    if (!userId || !collectionId) return false;

    try {
      if (userCollection) {
        // Remove collection from user's list if it exists
        const success = await removeCollectionFromUser(userId, collectionId);
        if (success) {
          setUserCollection(null);
        }
        return success;
      } else {
        // Add collection to user's list if it doesn't exist
        const added = await addCollectionToUser(userId, collectionId);
        if (added) {
          setUserCollection(added);
          return true;
        }
        return false;
      }
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Error toggling user collection")
      );
      return false;
    }
  };

  return {
    userCollection,
    loading,
    error,
    toggleCollection,
    hasCollection: Boolean(userCollection),
  };
};

// New hook to get active collections
export const useActiveCollections = (userId: string | null) => {
  const [activeCollections, setActiveCollections] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadActiveCollections = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await fetchActiveCollectionIds(userId);

        if (isMounted) {
          setActiveCollections(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Unknown error fetching active collections")
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadActiveCollections();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const toggleCollectionActive = async (
    collectionId: string, 
    isActive: boolean
  ): Promise<boolean> => {
    if (!userId) return false;

    try {
      const success = await setCollectionActive(userId, collectionId, isActive);
      
      if (success) {
        // Refresh the active collections
        const updatedCollections = await fetchActiveCollectionIds(userId);
        setActiveCollections(updatedCollections);
      }
      
      return success;
    } catch (err) {
      setError(
        err instanceof Error 
          ? err 
          : new Error("Error toggling collection active state")
      );
      return false;
    }
  };

  return {
    activeCollections,
    loading,
    error,
    toggleCollectionActive
  };
};
