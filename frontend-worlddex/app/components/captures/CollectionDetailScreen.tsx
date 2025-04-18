import React, { useState, useEffect } from "react";
import { View, Text, ActivityIndicator, FlatList, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCollectionItems, fetchCollectionItems } from "../../../database/hooks/useCollectionItems";
import { CollectionItem } from "../../../database/types";
import CollectionItemThumbnail from "./CollectionItemThumbnail";

interface CollectionDetailScreenProps {
  collectionId: string;
  onClose: () => void;
}

const CollectionDetailScreen: React.FC<CollectionDetailScreenProps> = ({
  collectionId,
  onClose,
}) => {
  const { collectionItems, loading: hookLoading, error: hookError } = useCollectionItems(collectionId);
  const [refreshedItems, setRefreshedItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Refresh collection items when the screen is shown
  useEffect(() => {
    const refreshCollectionItems = async () => {
      try {
        setLoading(true);
        const freshItems = await fetchCollectionItems(collectionId);
        setRefreshedItems(freshItems);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load collection items"));
      } finally {
        setLoading(false);
      }
    };

    refreshCollectionItems();
  }, [collectionId]);

  // Use the hook data as fallback if refresh hasn't completed
  useEffect(() => {
    if (collectionItems.length > 0 && refreshedItems.length === 0 && !loading) {
      setRefreshedItems(collectionItems);
    }
  }, [collectionItems, refreshedItems, loading]);

  if (loading || hookLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="#FFF" />
      </View>
    );
  }

  if (error || hookError) {
    return (
      <View className="flex-1 justify-center items-center bg-background p-4">
        <Text className="text-error">{(error || hookError)?.message}</Text>
      </View>
    );
  }

  const displayItems = refreshedItems.length > 0 ? refreshedItems : collectionItems;

  if (!displayItems.length) {
    return (
      <View className="flex-1 justify-center items-center bg-background p-4">
        <Text className="text-text-primary font-lexend-medium">No items in this collection.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="flex-1">
        <FlatList
          data={displayItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CollectionItemThumbnail item={item} onPress={() => { }} />
          )}
          numColumns={3}
          columnWrapperStyle={{ justifyContent: 'flex-start', paddingHorizontal: 8 }}
          contentContainerStyle={{ paddingVertical: 8 }}
          showsVerticalScrollIndicator={false}
          style={{ width: '100%', flex: 1 }}
        />
      </View>
      <TouchableOpacity
        className="absolute top-10 right-4 w-10 h-10 rounded-full bg-gray-800 justify-center items-center"
        onPress={onClose}
      >
        <Ionicons name="close" size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
};

export default CollectionDetailScreen; 