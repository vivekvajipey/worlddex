import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Capture } from "../../../database/types";

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
          <Image 
            source={{ uri: downloadUrl || undefined }} 
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={250}
          />
          <View className="absolute bottom-1 left-1 bg-black/50 px-2 py-1 rounded-md">
            <Text className="text-white text-xs font-lexend-medium">#{capture.capture_number}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default CaptureThumbnail; 