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
