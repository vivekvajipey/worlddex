import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { supabase, Tables } from "../../../database/supabase-client";
import { useAuth } from "../../../src/contexts/AuthContext";
import { fetchUser } from "../../../database/hooks/useUsers";
import { Ionicons } from "@expo/vector-icons";
import OfflineIndicator from "../OfflineIndicator";

type CollectionLeaderboardItem = {
  id: string;
  username: string;
  profile_picture_key?: string;
  item_count: number;
  position: number;
};

type CollectionLeaderboard = {
  id: string;
  name: string;
  description?: string;
  cover_photo_key?: string;
  is_featured: boolean;
  top_collectors: CollectionLeaderboardItem[];
  is_expanded: boolean;
};

const CollectionLeaderboards = () => {
  const { session } = useAuth();
  const currentUserId = session?.user?.id;

  const [collectionLeaderboards, setCollectionLeaderboards] = useState<CollectionLeaderboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all collections and their top collectors
  const fetchCollectionLeaderboards = async () => {
    try {
      setLoading(true);
      // Fetch all collections
      const { data: collections, error: collectionsError } = await supabase
        .from(Tables.COLLECTIONS)
        .select("*");

      if (collectionsError) {
        console.error("Error fetching collections:", collectionsError);
        throw collectionsError;
      }

      if (!collections || collections.length === 0) {
        setCollectionLeaderboards([]);
        return;
      }

      // Sort collections: featured first, then alphabetically
      const sortedCollections = collections.sort((a, b) => {
        // First by featured status (featured items first)
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;

        // Then alphabetically by name
        return a.name.localeCompare(b.name);
      });

      const leaderboards: CollectionLeaderboard[] = [];

      // Process each collection
      for (const collection of sortedCollections) {
        try {
          // Get top 3 users for this collection - using regular query instead of group
          const { data: userItems, error: userItemsError } = await supabase
            .from(Tables.USER_COLLECTION_ITEMS)
            .select('user_id, collection_id')
            .eq('collection_id', collection.id);

          if (userItemsError) {
            console.error(`Error fetching user items for collection ${collection.id}:`, userItemsError);
            continue;
          }

          // Count items manually
          const userCounts = new Map<string, number>();

          userItems?.forEach(item => {
            const userId = item.user_id;
            userCounts.set(userId, (userCounts.get(userId) || 0) + 1);
          });

          // Convert to array and sort
          const topCollectors = Array.from(userCounts.entries())
            .map(([userId, count]) => ({ user_id: userId, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);

          if (!topCollectors || topCollectors.length === 0) {
            // Add collection with empty top collectors
            leaderboards.push({
              ...collection,
              top_collectors: [],
              is_expanded: false,
            });
            continue;
          }

          // Fetch user details for each top collector
          const collectors: CollectionLeaderboardItem[] = [];

          for (let i = 0; i < topCollectors.length; i++) {
            const item = topCollectors[i];
            const userData = await fetchUser(item.user_id);

            if (userData) {
              collectors.push({
                id: userData.id,
                username: userData.username,
                profile_picture_key: userData.profile_picture_key,
                item_count: item.count,
                position: i + 1
              });
            }
          }

          // Add collection with its top collectors
          leaderboards.push({
            ...collection,
            top_collectors: collectors,
            is_expanded: false,
          });
        } catch (err) {
          console.error(`Error processing collection ${collection.id}:`, err);
          // Continue to the next collection even if this one fails
        }
      }

      setCollectionLeaderboards(leaderboards);
    } catch (err) {
      console.error("Collection leaderboards error:", err);
      setError(err instanceof Error ? err.message : "Failed to load collection leaderboards");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollectionLeaderboards();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center py-4">
        <ActivityIndicator size="small" color="#6366f1" />
      </View>
    );
  }

  if (error) {
    // Check if it's a network-related error
    const isNetworkError = error.toLowerCase().includes('network') || 
                          error.toLowerCase().includes('fetch') ||
                          error.toLowerCase().includes('connection') ||
                          error.toLowerCase().includes('timeout');
    
    if (isNetworkError) {
      return (
        <View className="p-4">
          <OfflineIndicator message="Collection leaderboards unavailable offline" showSubtext={false} />
        </View>
      );
    }
    
    return (
      <View className="flex-1 justify-center items-center p-4">
        <Text className="text-red-500">{error}</Text>
        <Text
          className="text-primary mt-4 font-lexend-medium"
          onPress={fetchCollectionLeaderboards}
        >
          Tap to retry
        </Text>
      </View>
    );
  }

  if (collectionLeaderboards.length === 0) {
    return (
      <View className="py-8 items-center">
        <Text className="text-gray-400">No collections available</Text>
      </View>
    );
  }

  const toggleExpand = (collectionId: string) => {
    setCollectionLeaderboards(prevState =>
      prevState.map(item =>
        item.id === collectionId
          ? { ...item, is_expanded: !item.is_expanded }
          : item
      )
    );
  };

  const renderCollectorItem = (item: CollectionLeaderboardItem) => {
    const isCurrentUser = item.id === currentUserId;

    // Determine position color
    let positionColor = "#000"; // Default color
    if (item.position === 1) {
      positionColor = "#FFD700"; // Gold
    } else if (item.position === 2) {
      positionColor = "#C0C0C0"; // Silver
    } else if (item.position === 3) {
      positionColor = "#CD7F32"; // Bronze
    }

    return (
      <View
        key={item.id}
        className={`flex-row items-center justify-between p-3 mb-1 rounded-lg ${isCurrentUser ? "bg-primary/10" : "bg-card/50"}`}
      >
        <View className="flex-row items-center">
          <Text
            style={{ color: positionColor, fontWeight: 'bold' }}
            className="text-lg mr-3"
          >
            {item.position}
          </Text>
          <Text
            className={`text-base ${isCurrentUser ? "font-lexend-bold" : "font-lexend-medium"}`}
          >
            {item.username}
          </Text>
          {isCurrentUser && (
            <Text className="text-xs ml-2 text-primary">(You)</Text>
          )}
        </View>
        <Text className="font-lexend-medium">
          {item.item_count} items
        </Text>
      </View>
    );
  };

  return (
    <ScrollView className="px-4">
      {collectionLeaderboards.map(collection => (
        <View key={collection.id} className="mb-4 border-b border-gray-200 pb-4">
          <TouchableOpacity
            className="flex-row justify-between items-center"
            onPress={() => toggleExpand(collection.id)}
          >
            <View className="flex-row items-center flex-1">
              <Text className="text-lg font-lexend-bold mr-2">{collection.name}</Text>

              {collection.is_featured && (
                <View className="bg-orange-500 px-2 py-1 rounded-full">
                  <Text className="text-white text-xs font-lexend-medium">
                    Featured
                  </Text>
                </View>
              )}
            </View>

            <Ionicons
              name={collection.is_expanded ? "chevron-up" : "chevron-down"}
              size={20}
              color="#6366f1"
            />
          </TouchableOpacity>

          {collection.is_expanded && (
            <View className="mt-2">
              {collection.top_collectors.length > 0 ? (
                collection.top_collectors.map(collector => renderCollectorItem(collector))
              ) : (
                <Text className="text-gray-400 py-4 text-center">No collectors yet</Text>
              )}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
};

export default CollectionLeaderboards;