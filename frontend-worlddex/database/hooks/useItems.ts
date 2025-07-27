import { useState, useEffect } from "react";
import { supabase, Tables } from "../supabase-client";
import { AllItem } from "../types";

// Data access functions
export const fetchItem = async (itemId: string): Promise<AllItem | null> => {
  const { data, error } = await supabase
    .from(Tables.ALL_ITEMS)
    .select("*")
    .eq("id", itemId)
    .single();

  if (error) {
    console.error("Error fetching item:", error);
    return null;
  }

  return data;
};

export const fetchItemByName = async (
  name: string
): Promise<AllItem | null> => {
  const { data, error } = await supabase
    .from(Tables.ALL_ITEMS)
    .select("*")
    .eq("name", name)
    .maybeSingle(); // allow zero rows without error

  if (error) {
    console.error("Error fetching item by name:", error);
    return null;
  }

  return data;
};

export const fetchAllItems = async (limit: number = 20): Promise<AllItem[]> => {
  const { data, error } = await supabase
    .from(Tables.ALL_ITEMS)
    .select("*")
    .order("total_captures", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching all items:", error);
    return [];
  }

  return data || [];
};

export const createItem = async (
  item: Omit<AllItem, "id" | "created_at">
): Promise<AllItem | null> => {
  const { data, error } = await supabase
    .from(Tables.ALL_ITEMS)
    .insert(item)
    .select()
    .single();

  if (error) {
    console.error("Error creating item:", error);
    return null;
  }

  return data;
};

export const updateItem = async (
  itemId: string,
  updates: Partial<AllItem>
): Promise<AllItem | null> => {
  const { data, error } = await supabase
    .from(Tables.ALL_ITEMS)
    .update(updates)
    .eq("id", itemId)
    .select()
    .single();

  if (error) {
    console.error("Error updating item:", error);
    return null;
  }

  return data;
};

export const incrementCaptures = async (
  itemId: string,
  amount: number = 1
): Promise<boolean> => {
  const { error } = await supabase.rpc("increment_item_captures", {
    item_id: itemId,
    increment_amount: amount,
  });

  if (error) {
    console.error("Error incrementing captures:", error);
    return false;
  }

  return true;
};

export const incrementOrCreateItem = async (
  name: string
): Promise<{ item: AllItem | null; isGlobalFirst: boolean }> => {
  const existing = await fetchItemByName(name);
  if (existing) {
    // Increment total_captures via update
    const updated = await updateItem(existing.id, { total_captures: existing.total_captures + 1 });
    if (!updated) {
      console.error("Error updating capture count for item:", name);
      return { item: null, isGlobalFirst: false };
    }
    return { item: updated, isGlobalFirst: false };
  }
  // Create new item with initial capture count - this is a global first!
  const newItem = await createItem({ name, total_captures: 1 });
  if (!newItem) {
    console.error("Failed to create item for name:", name);
    return { item: null, isGlobalFirst: false };
  }
  console.log(`🌟 Global first capture! Item "${name}" has never been captured before!`);
  return { item: newItem, isGlobalFirst: true };
};

// React hooks
export const useItem = (itemId: string | null) => {
  const [item, setItem] = useState<AllItem | null>(null);
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
        const data = await fetchItem(itemId);

        if (isMounted) {
          setItem(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Unknown error fetching item")
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

  const updateItemData = async (
    updates: Partial<AllItem>
  ): Promise<boolean> => {
    if (!item || !itemId) return false;

    try {
      const updated = await updateItem(itemId, updates);
      if (updated) {
        setItem(updated);
        return true;
      }
      return false;
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Unknown error updating item")
      );
      return false;
    }
  };

  return { item, loading, error, updateItem: updateItemData };
};

export const useItems = (limit: number = 20) => {
  const [items, setItems] = useState<AllItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadItems = async () => {
      try {
        setLoading(true);
        const data = await fetchAllItems(limit);

        if (isMounted) {
          setItems(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Unknown error fetching items")
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
  }, [limit]);

  return { items, loading, error, incrementOrCreateItem };
};
