import React from "react";
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CaptureComment } from "../../../database/types";
import Comment from "./Comment";
import { useAuth } from "../../../src/contexts/AuthContext";

interface CommentListProps {
  comments: CaptureComment[];
  loading: boolean;
  onUserPress?: (userId: string) => void;
  onCommentPress?: (comment: CaptureComment) => void;
  onLoadMore?: () => void;
  hasMore: boolean;
  onAddComment?: () => void;
}

const CommentList: React.FC<CommentListProps> = ({
  comments,
  loading,
  onUserPress,
  onCommentPress,
  onLoadMore,
  hasMore,
  onAddComment,
}) => {
  const { session } = useAuth();
  const currentUserId = session?.user?.id;

  const renderFooter = () => {
    if (loading) {
      return (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" color="#3B82F6" />
        </View>
      );
    }

    if (hasMore) {
      return (
        <TouchableOpacity
          onPress={onLoadMore}
          className="py-4 items-center"
        >
          <Text className="text-primary font-lexend-medium">Load more comments</Text>
        </TouchableOpacity>
      );
    }

    return null;
  };

  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View className="py-8 items-center">
        <Ionicons name="chatbubble-outline" size={32} color="#CBD5E1" />
        <Text className="mt-2 text-gray-400 font-lexend-medium text-center">
          No comments yet
        </Text>
        <Text className="mt-1 text-gray-400 font-lexend-regular text-center">
          Be the first to share your thoughts!
        </Text>
      </View>
    );
  };

  return (
    <View className="flex-1">
      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
        <Text className="font-lexend-bold text-lg text-text-primary">
          Comments{comments.length > 0 ? ` (${comments.length})` : ""}
        </Text>
        
        {onAddComment && (
          <TouchableOpacity
            onPress={onAddComment}
            className="flex-row items-center"
          >
            <Ionicons name="add-circle-outline" size={20} color="#3B82F6" />
            <Text className="ml-1 text-primary font-lexend-medium">
              Add comment
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Comments list */}
      <FlatList
        data={comments}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Comment
            comment={item}
            onUserPress={onUserPress}
            onCommentPress={onCommentPress}
            isOwnComment={item.user_id === currentUserId}
          />
        )}
        ItemSeparatorComponent={() => (
          <View className="h-px bg-gray-100 ml-14 mr-3" />
        )}
        contentContainerStyle={{
          flexGrow: comments.length === 0 ? 1 : undefined
        }}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
      />
    </View>
  );
};

export default CommentList; 