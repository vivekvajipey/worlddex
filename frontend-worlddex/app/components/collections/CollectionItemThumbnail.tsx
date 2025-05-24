import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { CollectionItem } from "../../../database/types";
import { rarityColorBg, rarityColorTxt } from "../../../src/utils/rarityColors";

interface CollectionItemThumbnailProps {
  item: CollectionItem;
  onPress: () => void;
  isCollected?: boolean;
  downloadUrl?: string | null;
  loading?: boolean;
  captureRarity?: "common" | "uncommon" | "rare" | "epic" | "mythic" | "legendary" | null;
}

const CollectionItemThumbnail: React.FC<CollectionItemThumbnailProps> = ({
  item,
  onPress,
  isCollected = true,
  downloadUrl = null,
  loading = false,
  captureRarity = null,
}) => {
  // Badge color logic using the new rarity system
  const getBadgeClasses = () => {
    if (item.is_secret_rare) return { bg: "bg-rose-500", text: "text-white" };
    
    if (!captureRarity) return { bg: "bg-gray-500", text: "text-white" };
    
    // Use the new rarity color scheme
    const bgClass = rarityColorBg[captureRarity] || "bg-gray-500";
    const textClass = rarityColorTxt[captureRarity] || "text-white";
    
    return { bg: bgClass, text: textClass };
  };

  const badgeClasses = getBadgeClasses();
  const badgeText = item.is_secret_rare ? "Secret Rare" : (captureRarity ? captureRarity.charAt(0).toUpperCase() + captureRarity.slice(1) : null);

  return (
    <TouchableOpacity
      className="w-[32%] aspect-square m-[0.6%] rounded-lg overflow-hidden"
      onPress={isCollected ? onPress : undefined}
      activeOpacity={isCollected ? 0.8 : 1}
    >
      <View className="w-full h-full relative">
        {loading ? (
          <View className="w-full h-full bg-black/30 justify-center items-center">
            <ActivityIndicator size="small" color="#FFF" />
          </View>
        ) : downloadUrl ? (
          <Image
            source={{ uri: downloadUrl }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={300}
          />
        ) : (
          <View className="w-full h-full bg-gray-700 justify-center items-center">
            <Ionicons name="image-outline" size={32} color="#888" />
          </View>
        )}

        {/* Semi-transparent overlay for contrast */}
        <View className="absolute inset-0 bg-black/15" />

        {/* Lock overlay if not collected */}
        {!isCollected && (
          <View className="absolute inset-0 bg-black/30 justify-center items-center">
            <View className="bg-black/50 w-8 h-8 rounded-full justify-center items-center">
              <Ionicons name="lock-closed" size={16} color="#FFF" />
            </View>
          </View>
        )}

        {/* Rarity badge - only show for collected items with rarity */}
        {isCollected && badgeText && (
          <View
            className={`${badgeClasses.bg} absolute top-1 right-1 px-1.5 py-0.5 rounded-sm`}
          >
            <Text className={`${badgeClasses.text} text-[10px] font-lexend-medium`}>
              {badgeText}
            </Text>
          </View>
        )}

        {/* Item name bar, wrapping text, bottom-left only */}
        <View className="absolute bottom-1 left-1 px-2 py-1 bg-black/50 rounded-md max-w-[90%]">
          <Text
            className="text-white text-xs font-lexend-medium flex-wrap"
          >
            {item.display_name}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default CollectionItemThumbnail;
