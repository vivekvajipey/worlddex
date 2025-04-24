import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  FlatList,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Capture, CaptureComment } from "../../../database/types";
import { useCaptureComments } from "../../../database/hooks/useComments";
import { createComment } from "../../../src/api/comments";
import { useAuth } from "../../../src/contexts/AuthContext";
import Comment from "./Comment";

interface CommentModalProps {
  visible: boolean;
  capture: Capture | null;
  onClose: () => void;
  onUserPress?: (userId: string) => void;
  inputRef?: React.RefObject<TextInput>;
  onCommentAdded?: () => void;
}

const CommentModal: React.FC<CommentModalProps> = ({
  visible,
  capture,
  onClose,
  onUserPress,
  inputRef: externalInputRef,
  onCommentAdded,
}) => {
  const { session } = useAuth();
  const internalInputRef = useRef<TextInput>(null);
  const inputRef = externalInputRef || internalInputRef;
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Use the comments hook
  const {
    comments: commentData,
    loading,
    error,
    pageCount,
    fetchPage,
    refresh: refreshComments,
  } = useCaptureComments(capture?.id || null, { limit: 10 });

  // Convert to correct type - the hook returns generic Comment[] type but we need CaptureComment[]
  const comments = commentData as unknown as CaptureComment[];

  // Clear comment text when modal is closed
  useEffect(() => {
    if (!visible) {
      setCommentText("");
    }
  }, [visible]);

  // Track keyboard visibility
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !capture?.id || !session?.user?.id || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createComment({
        capture_id: capture.id,
        comment_text: commentText.trim(),
      });
      
      // Clear input and refresh comments
      setCommentText("");
      refreshComments();
      
      // Notify parent about new comment
      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (error) {
      console.error("Error submitting comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle pagination
  const handleLoadMore = () => {
    if (pageCount > 1) {
      fetchPage(2); // Load the next page
    }
  };

  if (!capture) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1">
        {/* Semi-transparent background that shows the photo behind - only visible above keyboard */}
        <TouchableOpacity 
          activeOpacity={1}
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
          className="flex-1"
        />
        
        {/* Modal Container - takes up bottom portion of screen */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="h-[70%]"
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        >
          {/* This ensures we have a solid background regardless of keyboard state */}
          <View className="absolute bottom-0 left-0 right-0 top-0 bg-white" />
          
          <View className="flex-1 bg-white rounded-t-3xl overflow-hidden shadow-xl">
            {/* Header */}
            <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
              <Text className="font-lexend-bold text-xl text-text-primary">
                Comments
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  Keyboard.dismiss();
                  onClose();
                }}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View className="flex-1">
              {loading && comments.length === 0 ? (
                <View className="flex-1 justify-center items-center">
                  <ActivityIndicator size="large" color="#3B82F6" />
                </View>
              ) : (
                <FlatList
                  data={comments}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => (
                    <Comment
                      comment={item}
                      onUserPress={onUserPress}
                      isOwnComment={item.user_id === session?.user?.id}
                    />
                  )}
                  ItemSeparatorComponent={() => (
                    <View className="h-px bg-gray-100 ml-14 mr-3" />
                  )}
                  contentContainerStyle={{
                    flexGrow: comments.length === 0 ? 1 : undefined
                  }}
                  ListEmptyComponent={loading ? null : (
                    <View className="py-8 items-center">
                      <Ionicons name="chatbubble-outline" size={32} color="#CBD5E1" />
                      <Text className="mt-2 text-gray-400 font-lexend-medium text-center">
                        No comments yet
                      </Text>
                      <Text className="mt-1 text-gray-400 font-lexend-regular text-center">
                        Be the first to share your thoughts!
                      </Text>
                    </View>
                  )}
                  ListFooterComponent={loading ? (
                    <View className="py-4 items-center">
                      <ActivityIndicator size="small" color="#3B82F6" />
                    </View>
                  ) : pageCount > 1 ? (
                    <TouchableOpacity
                      onPress={() => fetchPage(2)}
                      className="py-4 items-center"
                    >
                      <Text className="text-primary font-lexend-medium">Load more comments</Text>
                    </TouchableOpacity>
                  ) : null}
                />
              )}
            </View>

            {/* Comment Input - fixed at the bottom */}
            {session?.user && (
              <View className="p-4 pb-6 border-t border-gray-200 bg-white">
                <View className="flex-row items-center bg-gray-100 rounded-full px-4">
                  <TextInput
                    ref={inputRef}
                    value={commentText}
                    onChangeText={setCommentText}
                    placeholder="Add a comment..."
                    className="flex-1 py-3 font-lexend-regular"
                    multiline
                    maxLength={500}
                  />
                  {commentText.trim().length > 0 && (
                    <TouchableOpacity
                      onPress={handleSubmitComment}
                      disabled={isSubmitting}
                      className="ml-2 p-2 z-10"
                      hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color="#3B82F6" />
                      ) : (
                        <Ionicons name="send" size={24} color="#3B82F6" />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default CommentModal; 