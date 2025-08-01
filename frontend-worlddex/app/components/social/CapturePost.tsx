import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Capture } from "../../../database/types";
import { useDownloadUrl } from "../../../src/hooks/useDownloadUrl";
import { useLike } from "../../../database/hooks/useLike";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useUser } from "../../../database/hooks/useUsers";
import CommentModal from "./CommentModal";

interface CapturePostProps {
  capture: Capture;
  onUserPress?: (userId: string) => void;
  onCommentsPress?: (capture: Capture) => void;
  imageUrl?: string | null;
  profileImageUrl?: string | null;
  imageLoading?: boolean;
  profileLoading?: boolean;
}

const CapturePost: React.FC<CapturePostProps> = ({
  capture,
  onUserPress,
  onCommentsPress,
  imageUrl = null,
  profileImageUrl = null,
  imageLoading = false,
  profileLoading = false
}) => {
  const { liked, toggle: toggleLike, busy: likeInProgress } = useLike(capture.id || null);
  const { session } = useAuth();
  const { user, loading: userLoading } = useUser(capture.user_id);

  // Get rarity badge color
  const getBadgeColor = () => {
    switch (capture.rarity_tier?.toLowerCase()) {
      case "common": return "bg-gray-400";
      case "uncommon": return "bg-green-500";
      case "rare": return "bg-blue-500";
      case "epic": return "bg-purple-500";
      case "mythic": return "bg-rose-500";
      case "legendary": return "bg-amber-500";
      default: return "bg-gray-500";
    }
  };

  const badgeText = capture.rarity_tier
    ? capture.rarity_tier.charAt(0).toUpperCase() + capture.rarity_tier.slice(1)
    : "";

  // Only use useDownloadUrl for profile picture if not provided as prop
  const {
    downloadUrl: fallbackProfileUrl,
    loading: fallbackProfileLoading
  } = useDownloadUrl(
    !profileImageUrl && user?.profile_picture_key
      ? user.profile_picture_key
      : ""
  );

  // Determine profile image URL and loading state
  const finalProfileUrl = profileImageUrl || fallbackProfileUrl;
  const isProfileLoading = profileLoading || (!profileImageUrl && fallbackProfileLoading);

  const [likeCount, setLikeCount] = useState(capture.like_count || 0);
  const [commentCount, setCommentCount] = useState(capture.comment_count || 0);
  const [showComments, setShowComments] = useState(false);
  const inputRef = useRef<any>(null);

  const handleLikePress = () => {
    if (!session?.user) return; // Require authentication to like

    toggleLike();
    // Optimistically update like count
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
  };

  const handleCommentsPress = () => {
    if (onCommentsPress) {
      onCommentsPress(capture);
    } else {
      // Open comments modal
      setShowComments(true);
    }
  };

  const handleCommentAdded = () => {
    // Increment comment count when a new comment is added
    setCommentCount(prevCount => prevCount + 1);
  };

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return "Recently";

    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return "Recently";
    }
  };

  // Effect to focus the input when modal opens
  useEffect(() => {
    if (showComments && inputRef.current) {
      // Slight delay to ensure modal is fully visible before focusing
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [showComments]);

  return (
    <>
      <View className={`bg-white rounded-xl overflow-hidden mb-4 shadow-sm ${showComments ? 'opacity-60' : ''}`}>
        {/* User info header */}
        <View className="flex-row items-center p-3">
          <TouchableOpacity
            onPress={() => onUserPress?.(capture.user_id)}
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
                {userLoading ? "Loading..." : user?.username || "Unknown user"}
              </Text>
              <Text className="font-lexend-regular text-gray-500 text-xs">
                {formatTimeAgo(capture.captured_at)}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Capture image */}
        <View className="w-full aspect-square bg-gray-100">
          {imageLoading ? (
            <View className="w-full h-full justify-center items-center">
              <ActivityIndicator size="large" color="#999" />
            </View>
          ) : (
            <Image
              source={{ uri: imageUrl || undefined }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={300}
            />
          )}
        </View>

        {/* Caption and Rarity */}
        <View className="p-3">
          <View className="flex-row items-center mb-1">
            <Text 
              className="font-lexend-bold text-text-primary text-lg flex-1 mr-2"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {capture.item_name}
            </Text>
            {capture.rarity_tier && (
              <View className={`${getBadgeColor()} px-3 py-1 rounded-full flex-shrink-0`}>
                <Text className="text-white font-lexend-medium">
                  {badgeText}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Action buttons */}
        <View className="flex-row items-center px-3 pb-3">
          {/* Like button */}
          <TouchableOpacity
            onPress={handleLikePress}
            disabled={likeInProgress}
            className="flex-row items-center mr-5"
          >
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={24}
              color={liked ? "#e53e3e" : "#374151"}
            />
            <Text className="ml-1 font-lexend-medium text-text-primary">
              {likeCount > 0 ? likeCount : ""}
            </Text>
          </TouchableOpacity>

          {/* Comment button */}
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
      </View>

      {/* Comments Modal */}
      <CommentModal
        visible={showComments}
        capture={capture}
        onClose={() => setShowComments(false)}
        onUserPress={onUserPress}
        inputRef={inputRef}
        onCommentAdded={handleCommentAdded}
      />
    </>
  );
};

export default CapturePost; 