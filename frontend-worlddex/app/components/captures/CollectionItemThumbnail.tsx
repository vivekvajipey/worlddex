import React from "react";
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { useDownloadUrl } from "../../../src/hooks/useDownloadUrl";
import { CollectionItem } from "../../../database/types";

interface CollectionItemThumbnailProps {
  item: CollectionItem;
  onPress: () => void;
}

const CollectionItemThumbnail: React.FC<CollectionItemThumbnailProps> = ({
  item,
  onPress
}) => {
  const { downloadUrl, loading } = useDownloadUrl(item.silhouette_key);

  return (
    <TouchableOpacity
      className="w-[32%] aspect-square m-[0.6%] rounded-lg overflow-hidden"
      onPress={onPress}
    >
      <View className="w-full h-full bg-gray-800 justify-center items-center">
        {loading ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <>
            <Image
              source={{ uri: downloadUrl || undefined }}
              className="w-3/4 h-3/4"
              resizeMode="contain"
            />
            <Text className="text-white text-xs font-lexend-medium mt-1" numberOfLines={1}>
              {item.display_name}
            </Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default CollectionItemThumbnail; 