import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Capture } from "../../../database/types";
import { rarityColorBg, rarityColorTxt } from "../../../src/utils/rarityColors";

interface CaptureThumbnailProps {
  capture: Capture;
  onPress: () => void;
  downloadUrl?: string | null;
  loading?: boolean;
}

const CaptureThumbnail: React.FC<CaptureThumbnailProps> = ({ 
  capture, 
  onPress, 
  downloadUrl = null, 
  loading = false 
}) => {
  // Get rarity badge info
  const getRarityBadge = () => {
    if (!capture.rarity_tier) return null;
    
    const bgClass = rarityColorBg[capture.rarity_tier] || "bg-gray-500";
    const textClass = rarityColorTxt[capture.rarity_tier] || "text-white";
    const badgeText = capture.rarity_tier.charAt(0).toUpperCase() + capture.rarity_tier.slice(1);
    
    return { bgClass, textClass, badgeText };
  };

  const rarityBadge = getRarityBadge();

  return (
    <TouchableOpacity
      className="w-[32%] aspect-square m-[0.6%] rounded-lg overflow-hidden"
      onPress={onPress}
    >
      {loading ? (
        <View className="w-full h-full bg-gray-800 justify-center items-center">
          <ActivityIndicator size="small" color="#FFF" />
        </View>
      ) : (
        <View className="w-full h-full relative">
          <Image 
            source={{ uri: downloadUrl || undefined }} 
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={250}
          />
          
          {/* Semi-transparent overlay for contrast */}
          <View className="absolute inset-0 bg-black/15" />
          
          {/* Rarity badge - top right */}
          {rarityBadge && (
            <View
              className={`${rarityBadge.bgClass} absolute top-1 right-1 px-1.5 py-0.5 rounded-sm`}
            >
              <Text className={`${rarityBadge.textClass} text-[10px] font-lexend-medium`}>
                {rarityBadge.badgeText}
              </Text>
            </View>
          )}
          
          {/* Capture number - bottom left */}
          <View className="absolute bottom-1 left-1 bg-black/50 px-2 py-1 rounded-md">
            <Text className="text-white text-xs font-lexend-medium">#{capture.capture_number}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default CaptureThumbnail; 