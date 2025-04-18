import React from "react";
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { useDownloadUrl } from "../../../src/hooks/useDownloadUrl";
import { Collection } from "../../../database/types";

interface CollectionThumbnailProps {
  collection: Collection;
  onPress: () => void;
}

const CollectionThumbnail: React.FC<CollectionThumbnailProps> = ({
  collection,
  onPress,
}) => {
  const { downloadUrl, loading } = useDownloadUrl(collection.cover_photo_key || "");

  return (
    <TouchableOpacity
      className="h-20 mx-4 my-2 bg-gray-800 rounded-lg overflow-hidden"
      onPress={onPress}
    >
      <View className="flex-row h-full">
        <View className="w-20 h-full">
          {loading ? (
            <View className="w-full h-full bg-gray-700 justify-center items-center">
              <ActivityIndicator size="small" color="#FFF" />
            </View>
          ) : (
            <Image source={{ uri: downloadUrl || undefined }} className="w-full h-full" />
          )}
        </View>
        <View className="flex-1 justify-center p-3">
          <Text className="text-white font-lexend-bold text-lg">{collection.name}</Text>
          {collection.description && (
            <Text className="text-gray-300 font-lexend-regular text-xs" numberOfLines={1}>
              {collection.description}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default CollectionThumbnail; 