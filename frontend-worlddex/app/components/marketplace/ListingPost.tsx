import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  Modal,
  TextInput
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Listing, Capture } from "../../../database/types";
import { useDownloadUrl } from "../../../src/hooks/useDownloadUrl";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useUser } from "../../../database/hooks/useUsers";
import { useComments } from "../../../database/hooks/useComments";
import { useBids } from "../../../database/hooks/useBids";
import CommentModal from "../social/CommentModal";
import retroCoin from "../../../assets/images/retro_coin.png";
import { supabase } from "../../../database/supabase-client";
import { useTradeOffers } from "../../../database/hooks/useTradeOffers";

interface ListingPostProps {
  listing: Listing;
  captures: Capture[];
  onUserPress?: (userId: string) => void;
  onCommentsPress?: (listing: Listing) => void;
  imageUrls?: (string | null)[];
  profileImageUrl?: string | null;
  imageLoading?: boolean;
  profileLoading?: boolean;
  onBidPress?: (listing: Listing) => void;
  onBuyPress?: (listing: Listing) => void;
  onTradePress?: (listing: Listing) => void;
  onListingChanged?: () => void;
  onUserBalanceChanged?: () => void | Promise<void>;
  tradeButtonText?: string;
  refreshKey?: number;
}

const ListingPost: React.FC<ListingPostProps> = ({
  listing,
  captures,
  onUserPress,
  onCommentsPress,
  imageUrls = [],
  profileImageUrl = null,
  imageLoading = false,
  profileLoading = false,
  onBidPress,
  onBuyPress,
  onTradePress,
  onListingChanged,
  onUserBalanceChanged,
  tradeButtonText,
  refreshKey
}) => {
  const { session } = useAuth();
  const userId = session?.user?.id;

  // seller & current user
  const { user: seller, loading: userLoading } = useUser(listing.seller_id);
  const { user: currentUser, updateUser } = useUser(userId || null);

  // comments
  const { comments } = useComments(listing.id, "listing");
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(comments?.length || 0);

  // auction info modal
  const [showAuctionInfo, setShowAuctionInfo] = useState(false);

  // countdown state
  const [liveTimeLeft, setLiveTimeLeft] = useState("");
  const [isAlmostExpired, setIsAlmostExpired] = useState(false);

  // bids: check for an active bid
  const { bids, loading: bidsLoading } = useBids(listing.id);
  const hasUserActiveBid = !!bids?.find(
    (b) => b.bidder_id === userId && b.status === "active"
  );

  // Check for pending trade offers
  const { tradeOffers, refresh: refreshTradeOffers } = useTradeOffers(listing.id, null);
  const hasPendingOffers = tradeOffers?.some(offer => offer.status === "pending");

  // profile pic fallback
  const {
    downloadUrl: fallbackProfileUrl,
    loading: fallbackProfileLoading
  } = useDownloadUrl(
    !profileImageUrl && seller?.profile_picture_key
      ? seller.profile_picture_key
      : ""
  );
  const finalProfileUrl = profileImageUrl || fallbackProfileUrl;
  const isProfileLoading = profileLoading || (!profileImageUrl && fallbackProfileLoading);

  const isSeller = userId === listing.seller_id;

  // color‐coded post background
  const containerBgClass = isSeller
    ? "bg-gray-100"
    : listing.listing_type === "auction"
      ? "bg-blue-50"
      : listing.listing_type === "buy-now"
        ? "bg-green-50"
        : listing.listing_type === "trade"
          ? "bg-yellow-50"
          : "bg-white";

  // update countdown every second if within an hour
  useEffect(() => {
    const update = () => {
      const end = new Date(listing.expires_at).getTime();
      const now = Date.now();
      const diff = end - now;
      setIsAlmostExpired(diff <= 3600 * 1000);
      if (diff <= 0) {
        setLiveTimeLeft("Expired");
      } else {
        const secs = Math.floor(diff / 1000);
        if (secs < 3600) {
          const m = Math.floor(secs / 60);
          const s = secs % 60;
          setLiveTimeLeft(`${m}:${s.toString().padStart(2, "0")}`);
        } else {
          const d = Math.floor(diff / (1000 * 60 * 60 * 24));
          const h = Math.floor(
            (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
          );
          setLiveTimeLeft(d > 0 ? `${d}d ${h}h left` : `${h}h left`);
        }
      }
    };
    update();
    const intervalId = setInterval(update, 1000);
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [listing.expires_at]);

  useEffect(() => {
    setCommentCount(comments?.length || 0);
  }, [comments]);

  // Refresh trade offers when refreshKey changes
  useEffect(() => {
    refreshTradeOffers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // delete listing
  const handleDelete = async () => {
    Alert.alert(
      "Delete Listing",
      listing.listing_type === "auction"
        ? "Are you sure you want to delete this listing? All current bidders will be refunded."
        : "Are you sure you want to delete this listing?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase.rpc(
                "delete_listing_with_cleanup",
                {
                  p_listing_id: listing.id,
                  p_seller_id: listing.seller_id
                }
              );
              if (error) throw error;
              onListingChanged?.();
            } catch {
              Alert.alert("Error", "Failed to delete listing.");
            }
          }
        }
      ]
    );
  };

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return "Recently";
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return "Recently";
    }
  };

  // unified tags
  const yourTag = isSeller && (
    <View className="flex-row items-center bg-gray-200 px-2 py-0.5 rounded-full">
      <Text className="text-gray-700 text-sm font-lexend-medium">
        Your Listing
      </Text>
    </View>
  );

  const getTypeTag = () => {
    if (listing.listing_type === "auction") {
      const label =
        listing.auction_type === "first-price"
          ? "First-Price Auction"
          : "Second-Price Auction";
      return (
        <View className="flex-row items-center bg-blue-100 px-2 py-0.5 rounded-full">
          <Ionicons name="hammer" size={15} color="#2563EB" />
          <Text className="ml-1 text-sm font-lexend-medium text-blue-700">
            {label}
          </Text>
        </View>
      );
    }
    if (listing.listing_type === "buy-now") {
      return (
        <View className="flex-row items-center bg-green-100 px-2 py-0.5 rounded-full">
          <Ionicons name="pricetag" size={15} color="#16A34A" />
          <Text className="ml-1 text-sm font-lexend-medium text-green-700">
            Buy Now
          </Text>
        </View>
      );
    }
    if (listing.listing_type === "trade") {
      return (
        <View className="flex-row items-center bg-yellow-100 px-2 py-0.5 rounded-full">
          <Ionicons name="swap-horizontal" size={15} color="#F59E42" />
          <Text className="ml-1 text-sm font-lexend-medium text-yellow-700">
            Trade
          </Text>
        </View>
      );
    }
    return null;
  };

  // Handler to refresh offers before opening modal
  const handleReviewOffers = () => {
    refreshTradeOffers();
    onTradePress?.(listing);
  };

  const renderActionButton = () => {
    if (isSeller) {
      return (
        <TouchableOpacity
          onPress={handleDelete}
          className="flex-row items-center bg-red-100 px-3 py-2 rounded-full"
        >
          <Ionicons name="trash" size={18} color="#DC2626" />
          <Text className="ml-2 font-lexend-medium text-red-600">
            Delete
          </Text>
        </TouchableOpacity>
      );
    }
    switch (listing.listing_type) {
      case "auction":
        return (
          <TouchableOpacity
            onPress={() => onBidPress?.(listing)}
            className="bg-primary px-4 py-2 rounded-full"
            disabled={bidsLoading}
          >
            <Text className="text-white font-lexend-medium">
              {hasUserActiveBid ? "Update Bid" : "Place Bid"}
            </Text>
          </TouchableOpacity>
        );
      case "buy-now":
        return (
          <TouchableOpacity
            onPress={() => onBuyPress?.(listing)}
            className="bg-primary px-4 py-2 rounded-full"
          >
            <Text className="text-white font-lexend-medium">Buy Now</Text>
          </TouchableOpacity>
        );
      case "trade":
        return (
          <TouchableOpacity
            onPress={handleReviewOffers}
            className="bg-primary px-4 py-2 rounded-full"
          >
            <Text className="text-white font-lexend-medium">
              {tradeButtonText || "Make Trade Offer"}
            </Text>
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <View
        className={`
          ${containerBgClass}
          rounded-xl
          overflow-hidden
          mb-4
          shadow-sm
          ${showComments ? "opacity-60" : ""}
        `}
      >
        {/* Header */}
        <View className="flex-row items-center p-3">
          <TouchableOpacity
            onPress={() => onUserPress?.(listing.seller_id)}
            className="flex-row items-center flex-1"
          >
            {userLoading || isProfileLoading ? (
              <View className="w-10 h-10 rounded-full bg-gray-200 justify-center items-center">
                <ActivityIndicator size="small" color="#999" />
              </View>
            ) : (
              <Image
                source={
                  finalProfileUrl
                    ? { uri: finalProfileUrl }
                    : require("../../../assets/images/icon.png")
                }
                style={{ width: 40, height: 40, borderRadius: 20 }}
                contentFit="cover"
                transition={200}
              />
            )}
            <View className="ml-2 flex-1">
              <Text className="font-lexend-medium text-text-primary">
                {userLoading ? "Loading..." : seller?.username || "Unknown"}
              </Text>
              <Text className="font-lexend-regular text-gray-500 text-xs">
                {formatTimeAgo(listing.created_at)}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Time Left */}
          <View className="bg-gray-100 px-3 py-1 rounded-full ml-2">
            <Text
              className={`text-xs font-lexend-medium ${isAlmostExpired ? "text-red-600" : "text-gray-600"}`}
            >
              {liveTimeLeft}
            </Text>
          </View>
        </View>

        {/* Tags Row */}
        <View className="px-3 pb-1 pt-1 flex-row items-center">
          {yourTag}
          {getTypeTag()}
          {listing.listing_type === "auction" && (
            <TouchableOpacity
              onPress={() => setShowAuctionInfo(true)}
              className="ml-auto p-1"
            >
              <Ionicons
                name="information-circle-outline"
                size={24}
                color="#6B7280"
              />
            </TouchableOpacity>
          )}
          {/* Price badge for Buy Now, right-aligned */}
          {listing.listing_type === "buy-now" && typeof listing.price === "number" && (
            <View className="ml-auto flex-row items-center bg-yellow-100 px-3 py-1 rounded-full" style={{ minWidth: 54 }}>
              <Image
                source={retroCoin}
                style={{ width: 22, height: 22, marginRight: 4 }}
                contentFit="contain"
              />
              <Text className="text-primary font-lexend-bold text-lg">{listing.price}</Text>
            </View>
          )}
        </View>

        {/* Captures Carousel */}
        {captures.length > 0 && (
          <FlatList
            data={captures}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <View className="w-48 h-54 m-2 rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50">
                <Image
                  source={
                    imageUrls[index] ? { uri: imageUrls[index]! } : undefined
                  }
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
                <View className="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
                  <Text
                    className="text-white text-sm font-lexend-medium"
                    numberOfLines={2}
                  >
                    {item.item_name}
                  </Text>
                </View>
              </View>
            )}
            className="self-center"
            style={{ maxHeight: 240 }}
          />
        )}

        {/* Details: title + reserve */}
        <View className="px-3 pt-2 pb-1 flex-row justify-between items-start">
          <Text className="font-lexend-bold text-lg flex-1">
            {listing.title}
          </Text>
          {listing.listing_type === "auction" && isSeller && (
            <View className="flex-row items-center">
              <Text className="font-lexend-bold text-primary mr-1">
                Reserve:
              </Text>
              <Image
                source={retroCoin}
                style={{ width: 16, height: 16 }}
                contentFit="contain"
              />
              <Text className="font-lexend-bold text-primary ml-1">
                {listing.reserve_price}
              </Text>
            </View>
          )}
          {listing.listing_type === "trade" && isSeller && (
            <TouchableOpacity
              onPress={hasPendingOffers ? handleReviewOffers : undefined}
              disabled={!hasPendingOffers}
              className={`flex-row items-center px-3 py-1 rounded-full ${hasPendingOffers ? "bg-primary" : "bg-gray-300"}`}
            >
              <Text className={`font-lexend-medium ${hasPendingOffers ? "text-white" : "text-gray-500"}`}>
                Review Offers
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Description */}
        <View className="px-3 pb-2">
          <Text className="font-lexend-regular text-gray-600">
            {listing.description}
          </Text>
        </View>

        {/* Bottom Row: comments + action */}
        <View className="flex-row items-center justify-between px-3 pb-4">
          <TouchableOpacity
            onPress={() => setShowComments(true)}
            className="flex-row items-center"
          >
            <Ionicons name="chatbubble-outline" size={22} color="#374151" />
            <Text className="ml-1 font-lexend-medium">
              {commentCount > 0 ? commentCount : ""}
            </Text>
          </TouchableOpacity>

          {renderActionButton()}
        </View>
      </View>

      {/* Second-Price Auction Info Modal */}
      <Modal
        visible={showAuctionInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAuctionInfo(false)}
      >
        <View className="flex-1 bg-black/40 justify-center items-center px-6">
          <View className="bg-white rounded-2xl p-6 max-w-xl w-full">
            <Text className="text-xl font-lexend-bold mb-2">
              What is a Second-Price Auction?
            </Text>
            <Text className="mb-2 font-lexend-medium">How It Works:</Text>
            <Text className="mb-4 text-gray-700">
              In a second-price auction, the highest bidder wins but pays the
              second-highest bid amount. This encourages honest bidding — you
              bid your true value.
            </Text>
            <TouchableOpacity
              onPress={() => setShowAuctionInfo(false)}
              className="mt-4 bg-primary rounded-full px-6 py-2 self-center"
            >
              <Text className="text-white font-lexend-medium text-center">
                Got it
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Comments Modal */}
      <CommentModal
        visible={showComments}
        listing={listing}
        onClose={() => setShowComments(false)}
        onUserPress={onUserPress}
        inputRef={useRef<TextInput>(null) as React.RefObject<TextInput>}
        onCommentAdded={() => setCommentCount((c) => c + 1)}
      />
    </>
  );
};

export default ListingPost;
