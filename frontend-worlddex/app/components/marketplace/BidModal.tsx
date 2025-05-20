import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Listing } from "../../../database/types";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useUser } from "../../../database/hooks/useUsers";
import { supabase } from "../../../database/supabase-client";
import retroCoin from "../../../assets/images/retro_coin.png";
import { useBids } from "../../../database/hooks/useBids";
import { usePostHog } from "posthog-react-native";

interface BidModalProps {
  visible: boolean;
  onClose: () => void;
  listing: Listing;
  onBidPlaced?: () => void;
  onUserBalanceChanged?: () => void | Promise<void>;
}

const BidModal: React.FC<BidModalProps> = ({
  visible,
  onClose,
  listing,
  onBidPlaced,
  onUserBalanceChanged,
}) => {
  const { session } = useAuth();
  const userId = session?.user?.id || null;
  const { user: currentUser, updateUser } = useUser(userId);

  // only fetch global bids & highestBid
  const { highestBid, loading: bidsLoading, refresh } =
    useBids(listing.id);

  const [hasActiveBid, setHasActiveBid] = useState(false);
  const [bidAmount, setBidAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  // helper to pull in the freshest user record (and update context)
  const refreshUserData = async () => {
    if (!currentUser?.id) return;
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", currentUser.id)
        .single();
      if (error) throw error;
      if (data) {
        await updateUser(data);
      }
    } catch (err) {
      console.error("Error refreshing user data:", err);
    }
  };

  // when modal opens (or listing/user changes):
  // 1) refresh global bids
  // 2) refresh user data (balance etc)
  // 3) lookup this user's active bid
  useEffect(() => {
    if (!visible) return;

    // 1) global bids
    refresh();

    // 2) user balance & profile
    refreshUserData();

    // 3) fetch this user's active bid
    if (userId) {
      (async () => {
        const { data, error: fetchErr } = await supabase
          .from("bids")
          .select("id, amount")
          .eq("listing_id", listing.id)
          .eq("bidder_id", userId)
          .eq("status", "active")
          .single();

        if (!fetchErr && data) {
          setHasActiveBid(true);
          setBidAmount(data.amount.toString());
        } else {
          setHasActiveBid(false);
          setBidAmount("");
        }

        setError("");
      })();
    } else {
      setHasActiveBid(false);
      setBidAmount("");
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, listing.id, userId]);

  const posthog = usePostHog();

  useEffect(() => {
    // Track screen view when modal becomes visible
    if (visible && listing && posthog) {
      posthog.screen("Bid-Modal", {
        listingId: listing.id,
      });
    }
  }, [visible, listing, posthog]);

  const handlePlaceBid = async () => {
    if (!currentUser) {
      setError("You must be logged in to place a bid");
      return;
    }

    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount < 0) {
      setError("Please enter a valid bid amount (0 or greater)");
      return;
    }

    const balance = currentUser.balance || 0;
    if (!hasActiveBid && amount > balance) {
      setError("Insufficient balance to place this bid");
      return;
    }
    if (hasActiveBid) {
      const old = parseFloat(bidAmount) || 0;
      const extra = amount - old;
      if (extra > balance) {
        setError(`You need ${extra.toFixed(2)} more coins to increase`);
        return;
      }
    }

    setIsProcessing(true);
    setError("");
    try {
      const { error: rpcErr } = await supabase.rpc("place_bid", {
        p_listing_id: listing.id,
        p_amount: amount,
        p_bidder_id: currentUser.id,
      });
      if (rpcErr) throw rpcErr;

      // Track successful bid placement
      if (posthog) {
        posthog.capture("marketplace_bid_placed", {
          listingId: listing.id,
          amount: amount,
          listingType: "auction"
        });
      }

      // refresh bids & user data
      refresh();
      await refreshUserData();
      onBidPlaced?.();
      await onUserBalanceChanged?.();
      onClose();
    } catch (e: any) {
      console.error("Error placing bid:", e);
      setError(e.message || "Failed to place/update bid");
      
      // Track failed bid attempt
      if (posthog) {
        posthog.capture("marketplace_bid_failed", {
          listingId: listing.id,
          error: e.message || "Unknown error"
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetractBid = () => {
    if (!currentUser || !hasActiveBid) return;
    Alert.alert(
      "Retract Bid",
      "Are you sure? Your balance will be refunded.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Retract",
          style: "destructive",
          onPress: async () => {
            setIsProcessing(true);
            try {
              const { error: rpcErr } = await supabase.rpc("retract_bid", {
                p_listing_id: listing.id,
                p_bidder_id: currentUser.id,
              });
              if (rpcErr) throw rpcErr;

              refresh();
              await refreshUserData();
              onBidPlaced?.();
              await onUserBalanceChanged?.();
              onClose();
            } catch (e: any) {
              setError(e.message || "Failed to retract bid");
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const isAuctionExpired = listing.expires_at
    ? new Date(listing.expires_at) < new Date()
    : false;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/40 justify-center items-center px-6">
        <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-lexend-bold">
              {hasActiveBid ? "Update Bid" : "Place Bid"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Loading */}
          {bidsLoading ? (
            <View className="items-center py-4">
              <ActivityIndicator size="large" color="#F97316" />
              <Text className="mt-2 text-gray-500 font-lexend-regular">
                Loading bid info…
              </Text>
            </View>
          ) : (
            <>
              {/* Most recent balance */}
              <View className="flex-row items-center mb-4 bg-accent-200 p-3 rounded-lg">
                <Image
                  source={retroCoin}
                  style={{ width: 24, height: 24, marginRight: 8 }}
                  contentFit="contain"
                />
                <View>
                  <Text className="text-sm font-lexend-regular text-gray-600">
                    Your Balance
                  </Text>
                  <Text className="text-lg font-lexend-bold text-primary">
                    {currentUser?.balance ?? 0} coins
                  </Text>
                </View>
              </View>

              {/* Explanation */}
              <View className="mb-4 bg-gray-50 p-3 rounded-lg">
                <Text className="font-lexend-medium text-gray-800 mb-2">
                  How Second-Price Auctions Work:
                </Text>
                <Text className="text-gray-600 font-lexend-regular">
                  • The highest bidder wins but pays the second-highest bid{"\n"}
                  • Your bid is private—other bidders can’t see it{"\n"}
                  • Bid your true max value—you’ll never overpay
                </Text>
              </View>

              {/* Expired */}
              {isAuctionExpired ? (
                <View className="bg-error/20 p-4 rounded-lg mb-4">
                  <Text className="text-error font-lexend-medium text-center">
                    This auction has ended
                  </Text>
                </View>
              ) : (
                <>
                  {/* Input */}
                  <View className="mb-4">
                    <TextInput
                      value={bidAmount}
                      onChangeText={(t) => {
                        setBidAmount(t);
                        setError("");
                      }}
                      placeholder="Enter bid amount"
                      keyboardType="numeric"
                      className={`border rounded-lg p-3 font-lexend-regular ${error ? "border-error" : "border-gray-300"
                        }`}
                    />
                    {error && (
                      <Text className="text-error text-sm mt-1 font-lexend-regular">
                        {error}
                      </Text>
                    )}
                  </View>

                  {/* Actions */}
                  <View className="flex-row">
                    {hasActiveBid && (
                      <TouchableOpacity
                        onPress={handleRetractBid}
                        disabled={isProcessing}
                        className="flex-1 bg-error mr-2 py-2 rounded-full"
                      >
                        <Text className="text-white text-center font-lexend-medium">
                          Retract Bid
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={handlePlaceBid}
                      disabled={isProcessing}
                      className={`flex-1 py-2 rounded-full ${isProcessing ? "bg-gray-300" : "bg-primary"
                        }`}
                    >
                      {isProcessing ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text className="text-white text-center font-lexend-medium">
                          {hasActiveBid ? "Update Bid" : "Place Bid"}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default BidModal;
