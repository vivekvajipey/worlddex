import { useState, useEffect } from "react";
import { supabase, Tables } from "../supabase-client";
import { TradeOffer } from "../types";

// Data access functions
export const fetchTradeOffersByListingId = async (
  listingId: string
): Promise<TradeOffer[] | null> => {
  const { data, error } = await supabase
    .from(Tables.TRADE_OFFERS)
    .select("*")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching trade offers:", error);
    return null;
  }

  return data;
};

export const fetchTradeOffersByOffererId = async (
  offererId: string
): Promise<TradeOffer[] | null> => {
  const { data, error } = await supabase
    .from(Tables.TRADE_OFFERS)
    .select("*")
    .eq("offerer_id", offererId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user trade offers:", error);
    return null;
  }

  return data;
};

export const fetchTradeOfferById = async (
  tradeOfferId: string
): Promise<TradeOffer | null> => {
  const { data, error } = await supabase
    .from(Tables.TRADE_OFFERS)
    .select("*")
    .eq("id", tradeOfferId)
    .single();

  if (error) {
    console.error("Error fetching trade offer:", error);
    return null;
  }

  return data;
};

export const createTradeOffer = async (
  tradeOffer: Omit<TradeOffer, "id" | "created_at" | "updated_at" | "status">
): Promise<TradeOffer | null> => {
  const { data, error } = await supabase
    .from(Tables.TRADE_OFFERS)
    .insert({ ...tradeOffer, status: "pending" })
    .select()
    .single();

  if (error) {
    console.error("Error creating trade offer:", error);
    return null;
  }

  return data;
};

export const updateTradeOfferStatus = async (
  tradeOfferId: string,
  status: "pending" | "accepted" | "rejected" | "cancelled"
): Promise<TradeOffer | null> => {
  const { data, error } = await supabase
    .from(Tables.TRADE_OFFERS)
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", tradeOfferId)
    .select()
    .single();

  if (error) {
    console.error("Error updating trade offer status:", error);
    return null;
  }

  return data;
};

export const updateTradeOfferMessage = async (
  tradeOfferId: string,
  message: string
): Promise<TradeOffer | null> => {
  const { data, error } = await supabase
    .from(Tables.TRADE_OFFERS)
    .update({ message, updated_at: new Date().toISOString() })
    .eq("id", tradeOfferId)
    .select()
    .single();

  if (error) {
    console.error("Error updating trade offer message:", error);
    return null;
  }

  return data;
};

// React hook
export const useTradeOffers = (
  listingId: string | null,
  offererId?: string | null
) => {
  const [tradeOffers, setTradeOffers] = useState<TradeOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadTradeOffers = async () => {
      if (!listingId && !offererId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        let data: TradeOffer[] | null = null;

        if (listingId) {
          data = await fetchTradeOffersByListingId(listingId);
        } else if (offererId) {
          data = await fetchTradeOffersByOffererId(offererId);
        }

        if (isMounted) {
          setTradeOffers(data || []);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Unknown error fetching trade offers")
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTradeOffers();

    return () => {
      isMounted = false;
    };
  }, [listingId, offererId]);

  const createOffer = async (
    offerer_id: string,
    message?: string
  ): Promise<TradeOffer | null> => {
    if (!listingId) return null;

    try {
      const newOffer = await createTradeOffer({
        listing_id: listingId,
        offerer_id,
        message,
      });

      if (newOffer) {
        setTradeOffers((prev) => [newOffer, ...prev]);
      }

      return newOffer;
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Unknown error creating trade offer")
      );
      return null;
    }
  };

  const updateStatus = async (
    tradeOfferId: string,
    status: "pending" | "accepted" | "rejected" | "cancelled"
  ): Promise<TradeOffer | null> => {
    try {
      const updatedOffer = await updateTradeOfferStatus(tradeOfferId, status);

      if (updatedOffer) {
        setTradeOffers((prev) =>
          prev.map((offer) =>
            offer.id === tradeOfferId ? updatedOffer : offer
          )
        );
      }

      return updatedOffer;
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Unknown error updating trade offer status")
      );
      return null;
    }
  };

  const updateMessage = async (
    tradeOfferId: string,
    message: string
  ): Promise<TradeOffer | null> => {
    try {
      const updatedOffer = await updateTradeOfferMessage(tradeOfferId, message);

      if (updatedOffer) {
        setTradeOffers((prev) =>
          prev.map((offer) =>
            offer.id === tradeOfferId ? updatedOffer : offer
          )
        );
      }

      return updatedOffer;
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Unknown error updating trade offer message")
      );
      return null;
    }
  };

  return {
    tradeOffers,
    loading,
    error,
    createOffer,
    updateStatus,
    updateMessage,
  };
};

// Hook for a single trade offer
export const useTradeOffer = (tradeOfferId: string | null) => {
  const [tradeOffer, setTradeOffer] = useState<TradeOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadTradeOffer = async () => {
      if (!tradeOfferId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await fetchTradeOfferById(tradeOfferId);

        if (isMounted) {
          setTradeOffer(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Unknown error fetching trade offer")
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTradeOffer();

    return () => {
      isMounted = false;
    };
  }, [tradeOfferId]);

  const updateStatus = async (
    status: "pending" | "accepted" | "rejected" | "cancelled"
  ): Promise<TradeOffer | null> => {
    if (!tradeOfferId) return null;

    try {
      const updatedOffer = await updateTradeOfferStatus(tradeOfferId, status);

      if (updatedOffer) {
        setTradeOffer(updatedOffer);
      }

      return updatedOffer;
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Unknown error updating trade offer status")
      );
      return null;
    }
  };

  const updateMessage = async (message: string): Promise<TradeOffer | null> => {
    if (!tradeOfferId) return null;

    try {
      const updatedOffer = await updateTradeOfferMessage(tradeOfferId, message);

      if (updatedOffer) {
        setTradeOffer(updatedOffer);
      }

      return updatedOffer;
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Unknown error updating trade offer message")
      );
      return null;
    }
  };

  return {
    tradeOffer,
    loading,
    error,
    updateStatus,
    updateMessage,
  };
};
