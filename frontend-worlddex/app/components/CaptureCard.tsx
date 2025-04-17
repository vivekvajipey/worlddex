import React from "react";
import { View, Text, Image, ActivityIndicator } from "react-native";
import { useDownloadUrl } from "../../src/hooks/useDownloadUrl";
import type { Capture } from "../../database/types";

export default function CaptureCard({ capture }: { capture: Capture }) {
  const { downloadUrl, loading } = useDownloadUrl(capture.image_key);

  return (
    <View className="flex-1 m-2 bg-surface rounded-2xl overflow-hidden shadow-lg border border-primary/30">
      {loading ? (
        <View className="w-full h-28 justify-center items-center bg-gray-200">
          <ActivityIndicator size="large" color="#FFF" />
        </View>
      ) : (
        <Image
          source={{ uri: downloadUrl || undefined }}
          className="w-full h-28 bg-gray-200"
          resizeMode="cover"
        />
      )}
      <View className="p-3">
        <Text className="text-text-primary font-lexend-bold text-lg mb-1">{capture.item_name}</Text>
        <Text className="text-text-secondary text-xs">#{capture.capture_number}</Text>
      </View>
    </View>
  );
}
