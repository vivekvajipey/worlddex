import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { CollectionItem } from "../../../database/types";

interface CollectionItemThumbnailProps {
  item: CollectionItem;
  onPress: () => void;
  isCollected?: boolean;
  downloadUrl?: string | null;
  loading?: boolean;
}

// Function to determine background color class for the rarity badge
const getRarityColorClass = (item: CollectionItem): string => {
  if (!item.collection_rarity && !item.is_secret_rare) {
    return "bg-gray-500"; // Default gray for items without rarity
  }

  if (item.is_secret_rare) {
    return "bg-rose-500"; // Pink/rose color for secret rares
  }

  // Handle standard rarity levels
  switch (item.collection_rarity?.toLowerCase()) {
    case "common":
      return "bg-gray-400"; // Gray for common items
    case "uncommon":
      return "bg-green-500"; // Green for uncommon items
    case "rare":
      return "bg-blue-500"; // Blue for rare items
    case "epic":
      return "bg-purple-500"; // Purple for epic items
    case "legendary":
      return "bg-amber-500"; // Gold/amber for legendary items
    case "mythic":
      return "bg-rose-600"; // Rose for mythic items
    default:
      return "bg-gray-500"; // Default gray for unknown rarity
  }
};

// Function to get rarity display text
const getRarityDisplayText = (item: CollectionItem): string => {
  if (item.is_secret_rare) {
    return "Secret Rare";
  }

  return item.collection_rarity || "Common";
};

const CollectionItemThumbnail: React.FC<CollectionItemThumbnailProps> = ({
  item,
  onPress,
  isCollected = true, // Default to true for backward compatibility
  downloadUrl = null,
  loading = false
}) => {
  const rarityColorClass = getRarityColorClass(item);
  const rarityText = getRarityDisplayText(item);

  // Use TouchableOpacity but with a no-op function if not collected
  const handlePress = () => {
    if (isCollected) {
      onPress();
    }
    // Do nothing if not collected
  };

  return (
    <TouchableOpacity
      className="w-[32%] aspect-square m-[0.6%] rounded-lg overflow-hidden"
      onPress={handlePress}
      activeOpacity={isCollected ? 0.4 : 0.6} // Less opacity change when pressed if not collected
    >
      {loading ? (
        <View className="w-full h-full bg-primary-300 justify-center items-center">
          <ActivityIndicator size="small" color="#FFF" />
        </View>
      ) : (
        <View className="w-full h-full">
          <Image
            source={{ uri: downloadUrl || undefined }}
            style={{ 
              width: '100%', 
              height: '100%', 
              opacity: isCollected ? 1 : 0.3 
            }}
            contentFit="cover"
            transition={250}
          />

          {/* Rarity badge */}
          {item.collection_rarity && (
            <View className={`absolute top-1 right-1 ${rarityColorClass} px-1.5 py-0.5 rounded-sm`}>
              <Text className="text-white text-[10px] font-lexend-medium">
                {rarityText}
              </Text>
            </View>
          )}

          {/* Item name */}
          <View className={`absolute bottom-1 left-1 ${isCollected ? 'bg-black/50' : 'bg-black/70'} px-2 py-1 rounded-md`}>
            <Text className={`${isCollected ? 'text-white' : 'text-gray-300'} text-xs font-lexend-medium`}>
              {item.display_name}
            </Text>
          </View>

          {/* Lock icon for uncollected items */}
          {!isCollected && (
            <View className="absolute top-0 left-0 right-0 bottom-0 items-center justify-center">
              <View className="bg-black/30 w-8 h-8 rounded-full items-center justify-center">
                <Ionicons name="lock-closed" size={16} color="#FFF" />
              </View>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

export default CollectionItemThumbnail; 