import { useState, useEffect } from "react";
import { supabase, Tables } from "../supabase-client";
import { User } from "../types";

// Data access functions
export const fetchUser = async (userId: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from(Tables.USERS)
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user:", error);
    return null;
  }

  return data;
};

export const upsertUser = async (user: User): Promise<User | null> => {
  const { data, error } = await supabase
    .from(Tables.USERS)
    .upsert(user, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    console.error("Error upserting user:", error);
    return null;
  }

  return data;
};

export const updateUserField = async (
  userId: string,
  field: keyof User,
  value: any
): Promise<boolean> => {
  const { error } = await supabase
    .from(Tables.USERS)
    .update({ [field]: value })
    .eq("id", userId);

  if (error) {
    console.error(`Error updating user ${field}:`, error);
    return false;
  }

  return true;
};

export const incrementUserField = async (
  userId: string,
  field:
    | "reputation_points"
    | "capture_tier"
    | "daily_captures_used"
    | "capture_streak"
    | "balance"
    | "total_captures",
  value: number = 1
): Promise<boolean> => {
  // First get the current value
  const { data, error: fetchError } = await supabase
    .from(Tables.USERS)
    .select(field)
    .eq("id", userId)
    .single();

  if (fetchError) {
    console.error(`Error fetching user ${field}:`, fetchError);
    return false;
  }

  // Need to cast data[field] to avoid TypeScript error
  const currentValue = (data as any)[field] || 0;
  const newValue = currentValue + value;

  return await updateUserField(userId, field, newValue);
};

export const updateUserBalance = async (
  userId: string,
  amount: number
): Promise<boolean> => {
  return incrementUserField(userId, "balance", amount);
};

export const isUsernameAvailable = async (
  username: string,
  currentUserId: string
): Promise<boolean> => {
  if (!username || !username.trim()) return false;

  try {
    const { data, error } = await supabase
      .from(Tables.USERS)
      .select("id")
      .ilike("username", username.trim())
      .neq("id", currentUserId)
      .maybeSingle();

    if (error) {
      console.error("Error checking username availability:", error);
      return false;
    }

    // If data is null, username is available; if data exists, username is taken
    return data === null;
  } catch (error) {
    console.error("Error in isUsernameAvailable:", error);
    return false;
  }
};

// React hook
export const useUser = (userId: string | null) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const userData = await fetchUser(userId);

        if (isMounted) {
          setUser(userData);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Unknown error fetching user")
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const updateUser = async (updatedUser: Partial<User>): Promise<boolean> => {
    if (!user || !userId) return false;

    try {
      const updated = await upsertUser({ ...user, ...updatedUser, id: userId });
      if (updated) {
        setUser(updated);
        return true;
      }
      return false;
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Unknown error updating user")
      );
      return false;
    }
  };

  const updateBalance = async (amount: number): Promise<boolean> => {
    if (!user || !userId) return false;

    try {
      const success = await updateUserBalance(userId, amount);
      if (success && user) {
        setUser({ ...user, balance: (user.balance || 0) + amount });
      }
      return success;
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Unknown error updating balance")
      );
      return false;
    }
  };

  return { user, loading, error, updateUser, updateBalance };
};
