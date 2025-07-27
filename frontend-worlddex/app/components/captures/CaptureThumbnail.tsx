import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { CombinedCapture } from "../../../src/types/combinedCapture";

interface CaptureThumbnailProps {
  capture: CombinedCapture;
  onPress: () => void;
  downloadUrl?: string | null;
  loading?: boolean;
  isPending?: boolean;
}

const CaptureThumbnail: React.FC<CaptureThumbnailProps> = ({
  capture,
  onPress,
  downloadUrl = null,
  loading = false,
  isPending = false
}) => {
  // Get rarity badge info
  const getBadgeColor = () => {
    switch (capture.rarity_tier?.toLowerCase()) {
      case "common": return "bg-gray-400";
      case "uncommon": return "bg-green-500";
      case "rare": return "bg-blue-500";
      case "epic": return "bg-purple-500";
      case "mythic": return "bg-rose-500";
      case "legendary": return "bg-amber-500";
      default: return "bg-gray-500";
    }
  };

  const badgeText = capture.rarity_tier
    ? capture.rarity_tier.charAt(0).toUpperCase() + capture.rarity_tier.slice(1)
    : "";

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

          {/* Badge - top right: Pending for unidentified, Rarity for identified */}
          {isPending ? (
            <View className="bg-orange-500 absolute top-1 right-1 px-1.5 py-0.5 rounded-sm">
              <Text className="text-white text-[10px] font-lexend-medium">
                Pending
              </Text>
            </View>
          ) : capture.rarity_tier ? (
            <View
              className={`${getBadgeColor()} absolute top-1 right-1 px-1.5 py-0.5 rounded-sm`}
            >
              <Text className="text-white text-[10px] font-lexend-medium">
                {badgeText}
              </Text>
            </View>
          ) : null}

          {/* Capture number - bottom left (only for identified captures) */}
          {!isPending && capture.capture_number && (
            <View className="absolute bottom-1 left-1 bg-black/50 px-2 py-1 rounded-md">
              <Text className="text-white text-xs font-lexend-medium">#{capture.capture_number}</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

export default CaptureThumbnail; 