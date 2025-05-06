import { useState, useEffect } from "react";
import { supabase, Tables } from "../supabase-client";
import { TradeOfferItem, Capture } from "../types";

// Data access functions
export const fetchTradeOfferItemsByTradeOfferId = async (
  tradeOfferId: string
): Promise<TradeOfferItem[] | null> => {
  const { data, error } = await supabase
    .from(Tables.TRADE_OFFER_ITEMS)
    .select("*")
    .eq("trade_offer_id", tradeOfferId);

  if (error) {
    console.error("Error fetching trade offer items:", error);
    return null;
  }

  return data;
};

export const fetchTradeOfferItemsWithCaptures = async (
  tradeOfferId: string
): Promise<{ tradeOfferItem: TradeOfferItem; capture: Capture }[] | null> => {
  const { data, error } = await supabase
    .from(Tables.TRADE_OFFER_ITEMS)
    .select(
      `
      *,
      captures:${Tables.CAPTURES}(*)
    `
    )
    .eq("trade_offer_id", tradeOfferId);

  if (error) {
    console.error("Error fetching trade offer items with captures:", error);
    return null;
  }

  return data.map((item: any) => ({
    tradeOfferItem: {
      id: item.id,
      trade_offer_id: item.trade_offer_id,
      capture_id: item.capture_id,
    },
    capture: item.captures,
  }));
};

export const addTradeOfferItem = async (
  tradeOfferItem: Omit<TradeOfferItem, "id">
): Promise<TradeOfferItem | null> => {
  const { data, error } = await supabase
    .from(Tables.TRADE_OFFER_ITEMS)
    .insert(tradeOfferItem)
    .select()
    .single();

  if (error) {
    console.error("Error adding trade offer item:", error);
    return null;
  }

  return data;
};

export const removeTradeOfferItem = async (
  tradeOfferItemId: string
): Promise<boolean> => {
  const { error } = await supabase
    .from(Tables.TRADE_OFFER_ITEMS)
    .delete()
    .eq("id", tradeOfferItemId);

  if (error) {
    console.error("Error removing trade offer item:", error);
    return false;
  }

  return true;
};

export const removeTradeOfferItemByCapture = async (
  tradeOfferId: string,
  captureId: string
): Promise<boolean> => {
  const { error } = await supabase
    .from(Tables.TRADE_OFFER_ITEMS)
    .delete()
    .eq("trade_offer_id", tradeOfferId)
    .eq("capture_id", captureId);

  if (error) {
    console.error("Error removing trade offer item by capture:", error);
    return false;
  }

  return true;
};

export const addMultipleTradeOfferItems = async (
  items: Omit<TradeOfferItem, "id">[]
): Promise<TradeOfferItem[] | null> => {
  const { data, error } = await supabase
    .from(Tables.TRADE_OFFER_ITEMS)
    .insert(items)
    .select();

  if (error) {
    console.error("Error adding multiple trade offer items:", error);
    return null;
  }

  return data;
};

// React hook
export const useTradeOfferItems = (tradeOfferId: string | null) => {
  const [tradeOfferItems, setTradeOfferItems] = useState<TradeOfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadTradeOfferItems = async () => {
      if (!tradeOfferId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await fetchTradeOfferItemsByTradeOfferId(tradeOfferId);

        if (isMounted) {
          setTradeOfferItems(data || []);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Unknown error fetching trade offer items")
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTradeOfferItems();

    return () => {
      isMounted = false;
    };
  }, [tradeOfferId]);

  const addItem = async (captureId: string): Promise<TradeOfferItem | null> => {
    if (!tradeOfferId) return null;

    try {
      const newItem = await addTradeOfferItem({
        trade_offer_id: tradeOfferId,
        capture_id: captureId,
      });

      if (newItem) {
        setTradeOfferItems((prevItems) => [...prevItems, newItem]);
      }

      return newItem;
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Unknown error adding trade offer item")
      );
      return null;
    }
  };

  const removeItem = async (itemId: string): Promise<boolean> => {
    try {
      const success = await removeTradeOfferItem(itemId);

      if (success) {
        setTradeOfferItems((prevItems) =>
          prevItems.filter((item) => item.id !== itemId)
        );
      }

      return success;
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Unknown error removing trade offer item")
      );
      return false;
    }
  };

  const removeItemByCapture = async (captureId: string): Promise<boolean> => {
    if (!tradeOfferId) return false;

    try {
      const success = await removeTradeOfferItemByCapture(
        tradeOfferId,
        captureId
      );

      if (success) {
        setTradeOfferItems((prevItems) =>
          prevItems.filter((item) => item.capture_id !== captureId)
        );
      }

      return success;
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Unknown error removing trade offer item by capture")
      );
      return false;
    }
  };

  const addMultipleItems = async (
    captureIds: string[]
  ): Promise<TradeOfferItem[] | null> => {
    if (!tradeOfferId || captureIds.length === 0) return null;

    try {
      const items = captureIds.map((captureId) => ({
        trade_offer_id: tradeOfferId,
        capture_id: captureId,
      }));

      const newItems = await addMultipleTradeOfferItems(items);

      if (newItems) {
        setTradeOfferItems((prevItems) => [...prevItems, ...newItems]);
      }

      return newItems;
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Unknown error adding multiple trade offer items")
      );
      return null;
    }
  };

  return {
    tradeOfferItems,
    loading,
    error,
    addItem,
    removeItem,
    removeItemByCapture,
    addMultipleItems,
  };
};

// Hook for trade offer items with capture data
export const useTradeOfferItemsWithCaptures = (tradeOfferId: string | null) => {
  const [tradeOfferItemsWithCaptures, setTradeOfferItemsWithCaptures] =
    useState<{ tradeOfferItem: TradeOfferItem; capture: Capture }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadTradeOfferItemsWithCaptures = async () => {
      if (!tradeOfferId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await fetchTradeOfferItemsWithCaptures(tradeOfferId);

        if (isMounted) {
          setTradeOfferItemsWithCaptures(data || []);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err
              : new Error(
                  "Unknown error fetching trade offer items with captures"
                )
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTradeOfferItemsWithCaptures();

    return () => {
      isMounted = false;
    };
  }, [tradeOfferId]);

  return {
    tradeOfferItemsWithCaptures,
    loading,
    error,
  };
};
