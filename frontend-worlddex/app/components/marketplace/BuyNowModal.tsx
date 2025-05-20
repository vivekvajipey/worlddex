import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Listing } from "../../../database/types";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useUser } from "../../../database/hooks/useUsers";
import { supabase } from "../../../database/supabase-client";
import retroCoin from "../../../assets/images/retro_coin.png";
import { usePostHog } from "posthog-react-native";

interface BuyNowModalProps {
  visible: boolean;
  onClose: () => void;
  listing: Listing;
  onPurchaseComplete?: () => void;
  onUserBalanceChanged?: () => void | Promise<void>;
}

const BuyNowModal: React.FC<BuyNowModalProps> = ({
  visible,
  onClose,
  listing,
  onPurchaseComplete,
  onUserBalanceChanged,
}) => {
  const { session } = useAuth();
  const userId = session?.user?.id || null;
  const { user: currentUser, updateUser } = useUser(userId);
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const posthog = usePostHog();

  useEffect(() => {
    // Track screen view when modal becomes visible
    if (visible && listing && posthog) {
      posthog.screen("Buy-Now-Modal", {
        listingId: listing.id,
        price: listing.price
      });
    }
  }, [visible, listing, posthog]);

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

  const handleBuy = async () => {
    if (!currentUser || !listing.price) return;

    if ((currentUser.balance ?? 0) < listing.price) {
      setError("Insufficient balance to complete this purchase.");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      // Call the database function to handle the entire purchase process
      const { error: rpcErr } = await supabase.rpc(
        "process_buy_now_purchase",
        {
          p_listing_id: listing.id,
          p_buyer_id: currentUser.id
        }
      );
      if (rpcErr) throw rpcErr;

      // Track successful purchase
      if (posthog) {
        posthog.capture("marketplace_purchase_completed", {
          listingId: listing.id,
          price: listing.price,
          listingType: "buy_now"
        });
      }

      // Refresh user data and notify parent components
      await refreshUserData();
      if (onUserBalanceChanged) await onUserBalanceChanged();
      if (onPurchaseComplete) onPurchaseComplete();
      onClose();
    } catch (e: any) {
      console.error("Error making purchase:", e);
      setError(e.message || "Failed to process purchase. Please try again.");

      // Track failed purchase
      if (posthog) {
        posthog.capture("marketplace_purchase_failed", {
          listingId: listing.id,
          price: listing.price,
          error: e.message || "Unknown error"
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/40 justify-center items-center px-6">
        <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-lexend-bold">Confirm Purchase</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Most recent balance */}
          <View className="flex-row items-center mb-4 bg-accent-200 p-3 rounded-lg">
            <Image
              source={retroCoin}
              style={{ width: 24, height: 24, marginRight: 8 }}
              contentFit="contain"
            />
            <View>
              <Text className="text-sm font-lexend-regular text-gray-600">Your Balance</Text>
              <Text className="text-lg font-lexend-bold text-primary">
                {currentUser?.balance ?? 0} coins
              </Text>
            </View>
          </View>

          {/* Purchase details */}
          <View className="mb-6">
            <Text className="text-center font-lexend-regular text-gray-600">
              Are you sure you want to buy{" "}
              <Text className="font-lexend-bold text-text-primary">{listing.title}</Text>
              {" "}for{" "}
              <Text className="font-lexend-bold text-primary">{listing.price} coins</Text>?
            </Text>
            {error && (
              <Text className="text-error text-sm mt-2 text-center font-lexend-regular">
                {error}
              </Text>
            )}
          </View>

          {/* Actions */}
          <View className="flex-row">
            <TouchableOpacity
              className="flex-1 bg-gray-200 py-2 rounded-full mr-2"
              onPress={onClose}
              disabled={isProcessing}
            >
              <Text className="text-center font-lexend-medium">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-2 rounded-full ${isProcessing ? "bg-gray-300" : "bg-primary"}`}
              onPress={handleBuy}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text className="text-center text-white font-lexend-bold">Confirm</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default BuyNowModal; 