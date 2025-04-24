import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { formatDistanceToNow } from "date-fns";
import { CaptureComment } from "../../../database/types";
import { useUser } from "../../../database/hooks/useUsers";
import { useDownloadUrl } from "../../../src/hooks/useDownloadUrl";
import { Image } from "expo-image";
interface CommentProps {
  comment: CaptureComment;
  onUserPress?: (userId: string) => void;
  onCommentPress?: (comment: CaptureComment) => void;
  isOwnComment?: boolean;
}

const Comment: React.FC<CommentProps> = ({
  comment,
  onUserPress,
  onCommentPress,
  isOwnComment = false,
}) => {
  const { user, loading: userLoading } = useUser(comment.user_id);
  const { downloadUrl: profileImageUrl } = useDownloadUrl(user?.profile_picture_key || "");

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return "Recently";
    
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return "Recently";
    }
  };

  return (
    <TouchableOpacity
      className="px-3 py-2 flex-row"
      onPress={() => onCommentPress?.(comment)}
      activeOpacity={onCommentPress ? 0.7 : 1}
    >
      {/* User avatar */}
      <TouchableOpacity
        onPress={() => onUserPress?.(comment.user_id)}
        activeOpacity={0.7}
        className="mr-3"
      >
        <Image
          source={
            profileImageUrl
              ? { uri: profileImageUrl }
              : require("../../../assets/images/icon.png")
          }
          style={{ width: 32, height: 32, borderRadius: 16 }}
          contentFit="cover"
          transition={200}
        />
      </TouchableOpacity>

      {/* Comment content */}
      <View className="flex-1">
        <View className="flex-row items-baseline">
          <Text className="font-lexend-medium text-text-primary">
            {userLoading ? "Loading..." : user?.username || "Unknown user"}
          </Text>
          
          {isOwnComment && (
            <View className="ml-2 px-1.5 py-0.5 bg-gray-100 rounded">
              <Text className="text-xs text-gray-500 font-lexend-regular">You</Text>
            </View>
          )}
          
          <Text className="ml-2 text-xs text-gray-500 font-lexend-regular">
            {formatTimeAgo(comment.created_at)}
          </Text>
        </View>
        
        <Text className="mt-1 font-lexend-regular text-text-primary">
          {comment.comment_text}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default Comment; 