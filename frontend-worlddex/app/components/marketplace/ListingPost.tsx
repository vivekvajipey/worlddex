import React, { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, Alert } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Listing, Capture } from "../../../database/types";
import { useDownloadUrl } from "../../../src/hooks/useDownloadUrl";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useUser, fetchUser, updateUserField } from "../../../database/hooks/useUsers";
import CommentModal from "../social/CommentModal";
import { useComments } from "../../../database/hooks/useComments";
import { deleteListing } from "../../../database/hooks/useListings";
import { createTransaction } from "../../../database/hooks/useTransactions";
import { updateCapture } from "../../../database/hooks/useCaptures";
import retroCoin from "../../../assets/images/retro_coin.png";
import { supabase } from "../../../database/supabase-client";

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
  children?: React.ReactNode;
  onListingChanged?: () => void;
  onUserBalanceChanged?: () => void | Promise<void>;
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
  onUserBalanceChanged
}) => {
  const { session } = useAuth();
  const { user: seller, loading: userLoading } = useUser(listing.seller_id);
  const { user: currentUser, updateUser } = useUser(session?.user?.id || null);
  const { comments, loading: commentsLoading } = useComments(listing.id, "listing");

  // Only use useDownloadUrl for profile picture if not provided as prop
  const {
    downloadUrl: fallbackProfileUrl,
    loading: fallbackProfileLoading
  } = useDownloadUrl(
    !profileImageUrl && seller?.profile_picture_key
      ? seller.profile_picture_key
      : ""
  );

  // Determine profile image URL and loading state
  const finalProfileUrl = profileImageUrl || fallbackProfileUrl;
  const isProfileLoading = profileLoading || (!profileImageUrl && fallbackProfileLoading);

  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(comments?.length || 0);
  const inputRef = useRef<any>(null);
  const isSeller = session?.user?.id === listing.seller_id;
  const [liveTimeLeft, setLiveTimeLeft] = useState("");

  useEffect(() => {
    const update = () => {
      const end = new Date(listing.expires_at);
      const now = new Date();
      const diff = end.getTime() - now.getTime();
      if (diff <= 0) {
        setLiveTimeLeft("Expired");
        return;
      }
      const totalSeconds = Math.floor(diff / 1000);
      if (totalSeconds < 3600) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        setLiveTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`);
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        if (days > 0) setLiveTimeLeft(`${days}d ${hours}h left`);
        else setLiveTimeLeft(`${hours}h left`);
      }
    };

    update();
    let id: number | undefined;

    if (new Date(listing.expires_at).getTime() - Date.now() < 3600 * 1000) {
      id = setInterval(update, 1000) as number;
    }

    return () => {
      if (id) clearInterval(id);
    };
  }, [listing.expires_at]);

  useEffect(() => {
    setCommentCount(comments?.length || 0);
  }, [comments]);

  const handleDelete = async () => {
    Alert.alert(
      "Delete Listing",
      "Are you sure you want to delete this listing?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // Update UI immediately
            onListingChanged?.();
            // Delete from backend
            await deleteListing(listing.id);
          },
        },
      ]
    );
  };

  const handleCommentsPress = () => {
    setShowComments(true);
  };

  const handleCommentAdded = () => {
    setCommentCount((prevCount: number) => prevCount + 1);
  };

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return "Recently";

    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return "Recently";
    }
  };

  const getListingTypeTag = (type: string) => {
    switch (type) {
      case "auction":
        return (
          <View className="flex-row items-center justify-between w-full">
            <View className="flex-row items-center bg-blue-100 px-2 py-0.5 rounded-full self-start">
              <Ionicons name="hammer" size={15} color="#2563EB" />
              <Text className="ml-1 text-sm font-lexend-medium text-blue-700 leading-tight">
                Auction
              </Text>
            </View>
            {isSeller && (
              <Text className="font-lexend-bold text-primary text-base text-right">Reserve: {listing.reserve_price} coins</Text>
            )}
          </View>
        );
      case "buy-now":
        return (
          <View className="flex-row items-center justify-between w-full">
            <View className="flex-row items-center bg-green-100 px-2 py-0.5 rounded-full self-start">
              <Ionicons name="pricetag" size={15} color="#16A34A" />
              <Text className="ml-1 text-sm font-lexend-medium text-green-700 leading-tight">
                Buy Now
              </Text>
            </View>
            <View className="flex-row items-center bg-white border border-primary rounded-full px-2 py-0.5" style={{ minWidth: 44 }}>
              <Image
                source={retroCoin}
                style={{ width: 18, height: 18, marginRight: 3 }}
                contentFit="contain"
              />
              <Text className="text-primary font-lexend-bold text-base text-right">{listing.price}</Text>
            </View>
          </View>
        );
      case "trade":
        return (
          <View className="flex-row items-center bg-yellow-100 px-2 py-0.5 rounded-full self-start">
            <Ionicons name="swap-horizontal" size={15} color="#F59E42" />
            <Text className="ml-1 text-sm font-lexend-medium text-yellow-700 leading-tight">
              Trade
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  const renderActionButton = () => {
    if (isSeller) {
      return (
        <TouchableOpacity
          onPress={handleDelete}
          className="p-2"
        >
          <Ionicons name="trash" size={24} color="#EF4444" />
        </TouchableOpacity>
      );
    }
    switch (listing.listing_type) {
      case "auction":
        return (
          <TouchableOpacity
            onPress={() => onBidPress?.(listing)}
            className="bg-primary px-4 py-2 rounded-full"
          >
            <Text className="text-white font-lexend-medium">Place Bid</Text>
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
            onPress={() => {/* TODO: open trade modal */ }}
            className="bg-primary px-4 py-2 rounded-full"
          >
            <Text className="text-white font-lexend-medium">Make Trade Offer</Text>
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

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

  return (
    <>
      <View className={`bg-white rounded-xl overflow-hidden mb-4 shadow-sm ${showComments ? 'opacity-60' : ''}`}>
        {/* User info header */}
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
                {userLoading ? "Loading..." : seller?.username || "Unknown user"}
              </Text>
              <Text className="font-lexend-regular text-gray-500 text-xs">
                {formatTimeAgo(listing.created_at)}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Time left indicator */}
          <View className="bg-gray-100 px-3 py-1 rounded-full">
            <Text className="text-xs font-lexend-medium text-gray-600">
              {liveTimeLeft}
            </Text>
          </View>
        </View>

        {/* Listing type tag above carousel */}
        <View className="px-3 pb-1 pt-1 w-full">
          {getListingTypeTag(listing.listing_type)}
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
                  source={imageUrls && imageUrls[index] ? { uri: imageUrls[index] } : undefined}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
                <View className="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
                  <Text className="text-white text-sm font-lexend-medium text-center" numberOfLines={2}>
                    {item.item_name}
                  </Text>
                </View>
              </View>
            )}
            className="self-center"
            style={{ maxHeight: 240 }}
          />
        )}

        {/* Listing details - left aligned */}
        <View className="px-3 pt-2 pb-2">
          <Text className="font-lexend-bold text-text-primary text-lg mb-1 text-left">
            {listing.title}
          </Text>
          <Text className="font-lexend-regular text-gray-600 text-left">
            {listing.description}
          </Text>
        </View>

        {/* Action buttons */}
        <View className="flex-row items-center justify-between px-3 pb-4">
          {/* Comment button bottom left */}
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={handleCommentsPress}
              className="flex-row items-center"
            >
              <Ionicons name="chatbubble-outline" size={22} color="#374151" />
              <Text className="ml-1 font-lexend-medium text-text-primary">
                {commentCount > 0 ? commentCount : ""}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Action button or trash icon bottom right */}
          <View className="flex-row items-center">
            {renderActionButton()}
          </View>
        </View>
      </View>

      {/* Comments Modal for listings */}
      <CommentModal
        visible={showComments}
        listing={listing}
        onClose={() => setShowComments(false)}
        onUserPress={onUserPress}
        inputRef={inputRef}
        onCommentAdded={handleCommentAdded}
      />
    </>
  );
};

export default ListingPost; 