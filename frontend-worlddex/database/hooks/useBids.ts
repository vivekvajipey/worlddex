import { useState, useEffect } from "react";
import { supabase, Tables } from "../supabase-client";
import { Bid } from "../types";

// Data access functions
export const fetchBidsByListingId = async (
  listingId: string
): Promise<Bid[] | null> => {
  const { data, error } = await supabase
    .from(Tables.BIDS)
    .select("*")
    .eq("listing_id", listingId)
    .order("amount", { ascending: false });

  if (error) {
    console.error("Error fetching bids:", error);
    return null;
  }

  return data;
};

export const fetchBidsByBidderId = async (
  bidderId: string
): Promise<Bid[] | null> => {
  const { data, error } = await supabase
    .from(Tables.BIDS)
    .select("*")
    .eq("bidder_id", bidderId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user bids:", error);
    return null;
  }

  return data;
};

export const fetchHighestBid = async (
  listingId: string
): Promise<Bid | null> => {
  const { data, error } = await supabase
    .from(Tables.BIDS)
    .select("*")
    .eq("listing_id", listingId)
    .eq("status", "active")
    .order("amount", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching highest bid:", error);
    return null;
  }

  return data;
};

export const createBid = async (
  bid: Omit<Bid, "id" | "created_at" | "status">
): Promise<Bid | null> => {
  const { data, error } = await supabase
    .from(Tables.BIDS)
    .insert({ ...bid, status: "active" })
    .select()
    .single();

  if (error) {
    console.error("Error creating bid:", error);
    return null;
  }

  return data;
};

export const updateBidStatus = async (
  bidId: string,
  status: "active" | "winning" | "outbid" | "rejected" | "cancelled"
): Promise<boolean> => {
  const { error } = await supabase
    .from(Tables.BIDS)
    .update({ status })
    .eq("id", bidId);

  if (error) {
    console.error("Error updating bid status:", error);
    return false;
  }

  return true;
};

export const updateListingBidsStatus = async (
  listingId: string,
  status: "outbid" | "rejected" | "cancelled",
  excludeBidId?: string
): Promise<boolean> => {
  let query = supabase
    .from(Tables.BIDS)
    .update({ status })
    .eq("listing_id", listingId);

  if (excludeBidId) {
    query = query.neq("id", excludeBidId);
  }

  const { error } = await query;

  if (error) {
    console.error("Error updating listing bids status:", error);
    return false;
  }

  return true;
};

// React hook
export const useBids = (listingId: string | null, bidderId?: string | null) => {
  const [bids, setBids] = useState<Bid[]>([]);
  const [highestBid, setHighestBid] = useState<Bid | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadBids = async () => {
      if (!listingId && !bidderId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        let data: Bid[] | null = null;

        if (listingId) {
          data = await fetchBidsByListingId(listingId);
          const highest = data?.length ? data[0] : null;
          if (isMounted) {
            setHighestBid(highest);
          }
        } else if (bidderId) {
          data = await fetchBidsByBidderId(bidderId);
        }

        if (isMounted) {
          setBids(data || []);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Unknown error fetching bids")
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadBids();

    return () => {
      isMounted = false;
    };
  }, [listingId, bidderId]);

  const placeBid = async (
    amount: number,
    bidder_id: string
  ): Promise<Bid | null> => {
    if (!listingId) return null;

    try {
      // Check if this bid is higher than current highest
      if (highestBid && amount <= highestBid.amount) {
        throw new Error("Bid must be higher than current highest bid");
      }

      const newBid = await createBid({
        listing_id: listingId,
        bidder_id,
        amount,
      });

      if (newBid) {
        // Update other bids to 'outbid' status
        if (bids.length > 0) {
          await updateListingBidsStatus(listingId, "outbid", newBid.id);
        }

        // Update local state
        setBids((prevBids) => [
          newBid,
          ...prevBids.map((bid) =>
            bid.id !== newBid.id ? { ...bid, status: "outbid" as const } : bid
          ),
        ]);
        setHighestBid(newBid);
      }

      return newBid;
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Unknown error placing bid")
      );
      return null;
    }
  };

  const cancelBid = async (bidId: string): Promise<boolean> => {
    try {
      const success = await updateBidStatus(bidId, "cancelled");

      if (success) {
        // Update local state
        setBids((prevBids) =>
          prevBids.map((bid) =>
            bid.id === bidId ? { ...bid, status: "cancelled" } : bid
          )
        );

        // Update highest bid if necessary
        if (highestBid?.id === bidId) {
          const newHighest = bids.find(
            (bid) => bid.id !== bidId && bid.status === "active"
          );
          setHighestBid(newHighest || null);
        }
      }

      return success;
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Unknown error cancelling bid")
      );
      return false;
    }
  };

  return {
    bids,
    highestBid,
    loading,
    error,
    placeBid,
    cancelBid,
  };
};
