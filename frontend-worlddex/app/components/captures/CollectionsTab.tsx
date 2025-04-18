import React from "react";
import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { Collection } from "../../../database/types";
import CollectionThumbnail from "./CollectionThumbnail";

interface CollectionsTabProps {
  displayCollections: Collection[];
  loading: boolean;
  onCollectionPress: (collectionId: string) => void;
}

const CollectionsTab: React.FC<CollectionsTabProps> = ({
  displayCollections,
  loading,
  onCollectionPress,
}) => {
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#FFF" />
      </View>
    );
  }

  if (!displayCollections.length) {
    return (
      <View className="flex-1 justify-center items-center p-4">
        <Text className="text-text-primary font-lexend-medium">No featured collections yet.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <FlatList
        data={displayCollections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CollectionThumbnail
            collection={item}
            onPress={() => onCollectionPress(item.id)}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 8 }}
        style={{ width: '100%', flex: 1 }}
      />
    </View>
  );
};

export default CollectionsTab; 