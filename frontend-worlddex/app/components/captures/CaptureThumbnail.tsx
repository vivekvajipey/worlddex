import React from "react";
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { useDownloadUrl } from "../../../src/hooks/useDownloadUrl";
import { Capture } from "../../../database/types";

interface CaptureThumbnailProps {
  capture: Capture;
  onPress: () => void;
}

const CaptureThumbnail: React.FC<CaptureThumbnailProps> = ({ capture, onPress }) => {
  const { downloadUrl, loading } = useDownloadUrl(capture.image_key);

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
        <View className="w-full h-full">
          <Image source={{ uri: downloadUrl || undefined }} className="w-full h-full" />
          <View className="absolute bottom-1 left-1 bg-black/50 px-2 py-1 rounded-md">
            <Text className="text-white text-xs font-lexend-medium">#{capture.capture_number}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default CaptureThumbnail; 