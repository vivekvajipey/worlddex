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
  status: "active" | "winning" | "outbid" | "rejected" | "canceled"
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
  status: "outbid" | "rejected" | "canceled",
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

export const fetchBids = async (listingId: string): Promise<Bid[]> => {
  const { data, error } = await supabase
    .from("bids")
    .select("*")
    .eq("listing_id", listingId)
    .order("amount", { ascending: false });

  if (error) {
    console.error("Error fetching bids:", error);
    return [];
  }

  return data || [];
};

export const fetchUserBid = async (
  listingId: string,
  userId: string
): Promise<Bid | null> => {
  const { data, error } = await supabase
    .from("bids")
    .select("*")
    .eq("listing_id", listingId)
    .eq("bidder_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // No bid found
    console.error("Error fetching user bid:", error);
    return null;
  }

  return data;
};

// React hook
export const useBids = (listingId: string, userId?: string | null) => {
  const [bids, setBids] = useState<Bid[]>([]);
  const [highestBid, setHighestBid] = useState<Bid | null>(null);
  const [userBid, setUserBid] = useState<Bid | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadBids = async () => {
    try {
      setLoading(true);
      const bidsData = await fetchBids(listingId);
      setBids(bidsData);
      setHighestBid(bidsData[0] || null);

      if (userId) {
        const userBidData = await fetchUserBid(listingId, userId);
        setUserBid(userBidData);
      }

      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Unknown error fetching bids")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBids();

    // Subscribe to bid changes
    const subscription = supabase
      .channel(`listing_bids:${listingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bids",
          filter: `listing_id=eq.${listingId}`,
        },
        () => {
          loadBids();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [listingId, userId]);

  const placeBid = async (
    amount: number,
    bidder_id: string
  ): Promise<Bid | null> => {
    if (!listingId) return null;

    try {
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
      const success = await updateBidStatus(bidId, "canceled");

      if (success) {
        // Update local state
        setBids((prevBids) =>
          prevBids.map((bid) =>
            bid.id === bidId ? { ...bid, status: "canceled" } : bid
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
    userBid,
    loading,
    error,
    placeBid,
    cancelBid,
    refresh: loadBids,
  };
};
