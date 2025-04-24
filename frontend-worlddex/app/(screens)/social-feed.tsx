import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  SafeAreaView,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { useTopCaptures } from "../../database/hooks/useCaptures";
import CapturePost from "../components/social/CapturePost";
import { Capture } from "../../database/types";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function SocialFeed() {
  const router = useRouter();
  const [selectedCapture, setSelectedCapture] = useState<Capture | null>(null);
  
  // Use the top captures hook with pagination
  const {
    captures,
    loading,
    refreshData,
    fetchNextPage,
    hasMore,
    page,
    pageCount,
  } = useTopCaptures({
    limit: 10,
    minUpvotes: 0
  });

  // Event handlers
  const handleUserPress = useCallback((userId: string) => {
    // Navigate to user profile (implementation depends on app structure)
    console.log("Navigate to user profile:", userId);
    // We'll implement proper navigation when routes are set up
  }, []);

  const handleCapturePress = useCallback((capture: Capture) => {
    setSelectedCapture(capture);
    // For demonstration, just log the capture
    console.log("Capture pressed:", capture.id);
  }, []);

  const renderFooter = () => {
    if (!hasMore) return null;
    
    return (
      <View className="py-4 items-center">
        <ActivityIndicator size="small" color="#3B82F6" />
        <Text className="text-gray-500 mt-2 font-lexend-regular">
          Loading more...
        </Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    
    return (
      <View className="py-20 items-center">
        <Ionicons name="images-outline" size={64} color="#CBD5E1" />
        <Text className="text-gray-400 mt-4 text-lg font-lexend-medium text-center">
          No captures found
        </Text>
        <Text className="text-gray-400 mt-2 text-center max-w-xs font-lexend-regular">
          Be the first to share your captures with the world!
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
        <Text className="text-2xl font-lexend-bold text-text-primary">
          WorldDex Social
        </Text>
        <TouchableOpacity
          onPress={() => {
            // @ts-ignore - Type checking is strict, but this works in Expo Router
            router.navigate("/camera");
          }}
          className="w-10 h-10 rounded-full bg-primary items-center justify-center"
        >
          <Ionicons name="camera-outline" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
      
      {/* Feed */}
      <FlatList
        data={captures}
        keyExtractor={(item) => item.id || item.image_key}
        renderItem={({ item }) => (
          <CapturePost
            capture={item}
            onUserPress={handleUserPress}
            onCapturePress={handleCapturePress}
          />
        )}
        contentContainerStyle={{ 
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 120,
          flexGrow: captures.length === 0 ? 1 : undefined
        }}
        refreshControl={
          <RefreshControl
            refreshing={loading && page === 1}
            onRefresh={refreshData}
            colors={["#3B82F6"]}
            tintColor="#3B82F6"
          />
        }
        onEndReached={() => {
          if (!loading && hasMore) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
      />
      
      {/* Pagination indicator */}
      {pageCount > 1 && (
        <View className="absolute bottom-4 left-0 right-0 items-center">
          <View className="bg-gray-800/70 px-4 py-2 rounded-full">
            <Text className="text-white font-lexend-medium">
              Page {page} of {pageCount}
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
} 