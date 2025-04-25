import React, { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Collection } from "../../../database/types";

interface CollectionThumbnailProps {
  collection: Collection;
  onPress: () => void;
  downloadUrl?: string | null;
  loading?: boolean;
}

const CollectionThumbnail: React.FC<CollectionThumbnailProps> = ({
  collection,
  onPress,
  downloadUrl = null,
  loading = false
}) => {
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
              style={{ width: '100%', height: '100%', opacity: 0.2 }}
              contentFit="cover"
            />
            <ActivityIndicator size="small" color="#FFF" />
          </View>
        ) : (
          <View className="w-full h-full">
            {hasCustomImage ? (
              <Image
                source={{ uri: downloadUrl }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                onError={() => setImageError(true)}
                transition={300}
              />
            ) : (
              <Image
                source={defaultCoverImage}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
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