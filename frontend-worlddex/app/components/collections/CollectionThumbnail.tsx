import React, { useState } from "react";
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
  const [imageError, setImageError] = useState(false);

  // Import the default cover image
  const defaultCoverImage = require("../../../assets/images/WorldDex Horizontal.png");

  // Determine which image source to use
  const hasCustomImage = collection.cover_photo_key && downloadUrl && !imageError;

  return (
    <TouchableOpacity
      className="h-24 mx-4 my-2 rounded-lg overflow-hidden"
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View className="w-full h-full relative">
        {loading ? (
          <View className="w-full h-full bg-black/30 justify-center items-center">
            <Image
              source={defaultCoverImage}
              className="absolute w-full h-full opacity-20"
              resizeMode="cover"
            />
            <ActivityIndicator size="small" color="#FFF" />
          </View>
        ) : (
          <View className="w-full h-full">
            {hasCustomImage ? (
              <Image
                source={{ uri: downloadUrl }}
                className="w-full h-full"
                resizeMode="cover"
                onError={() => setImageError(true)}
                fadeDuration={300}
              />
            ) : (
              <Image
                source={defaultCoverImage}
                className="w-full h-full"
                resizeMode="cover"
              />
            )}

            {/* Overlay for text contrast */}
            <View className="absolute inset-0 bg-black/15" />
          </View>
        )}

        {/* Content */}
        <View className="absolute inset-0 p-3 justify-center">
          <Text className="text-white font-lexend-bold text-lg">{collection.name}</Text>
          {collection.description && (
            <Text className="text-white font-lexend-regular text-xs" numberOfLines={1}>
              {collection.description}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default CollectionThumbnail;