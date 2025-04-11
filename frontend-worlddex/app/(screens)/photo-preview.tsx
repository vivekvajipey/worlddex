import React from "react";
import { View, Image, TouchableOpacity, Text, Dimensions, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const IMAGE_MAX_HEIGHT = SCREEN_HEIGHT * 0.375; // 3/8 of screen height

export default function PhotoPreview() {
  const { photoUri } = useLocalSearchParams<{ photoUri: string }>();
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <View className="flex-1 bg-background-light">
      <ScrollView className="flex-1">
        {/* Image at the top, edge to edge */}
        <View className="w-full" style={{ height: IMAGE_MAX_HEIGHT }}>
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full justify-center items-center bg-black/10">
              <Text className="text-black font-lexend-medium text-base">No image available</Text>
            </View>
          )}
        </View>

        {/* Additional content */}
        <View className="w-full px-4 py-4">
          {/* Empty space for scrolling */}
          <View style={{ height: SCREEN_HEIGHT * 0.6 }} />
        </View>
      </ScrollView>

      {/* Back button - positioned absolutely over the image */}
      <TouchableOpacity
        className="absolute top-20 left-4 bg-background rounded-full w-10 h-10 flex items-center justify-center shadow-lg z-10"
        onPress={handleBack}
      >
        <Ionicons name="chevron-back" size={22} color="black" />
      </TouchableOpacity>
    </View>
  );
} 