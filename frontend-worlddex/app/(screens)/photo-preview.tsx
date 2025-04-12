import React, { useState, useEffect } from "react";
import { View, Image, TouchableWithoutFeedback, Dimensions, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { BlurView } from "expo-blur";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Polaroid dimensions
const POLAROID_WIDTH = SCREEN_WIDTH * 0.85;
const FRAME_EDGE_PADDING = POLAROID_WIDTH * 0.08; // Consistent padding for top, left, right
const FRAME_BOTTOM_PADDING = POLAROID_WIDTH * 0.15; // Slightly larger bottom padding

// Fixed photo container dimensions (the area where the photo will be placed)
const PHOTO_CONTAINER_WIDTH = POLAROID_WIDTH - (FRAME_EDGE_PADDING * 2);
const PHOTO_CONTAINER_HEIGHT = PHOTO_CONTAINER_WIDTH;

export default function PhotoPreview() {
  const { photoUri } = useLocalSearchParams<{ photoUri: string }>();
  const router = useRouter();

  // Handle tap outside the polaroid frame
  const handleBackgroundPress = () => {
    router.back();
  };

  return (
    <View className="flex-1">
      {/* Blurred overlay that allows camera to show through */}
      <BlurView
        intensity={30}
        tint="light"
        className="absolute inset-0"
      >
        {/* Make the blurred background clickable to dismiss */}
        <TouchableWithoutFeedback onPress={handleBackgroundPress}>
          <View className="flex-1" />
        </TouchableWithoutFeedback>
      </BlurView>

      {/* Polaroid frame - centered */}
      <View className="absolute inset-0 flex items-center justify-center">
        <View
          className="bg-white rounded-md shadow-lg overflow-hidden"
          style={{
            width: POLAROID_WIDTH,
            // Height is calculated to maintain the proper polaroid look
            height: PHOTO_CONTAINER_HEIGHT + FRAME_EDGE_PADDING + FRAME_BOTTOM_PADDING,
          }}
        >
          {/* Photo container with fixed dimensions */}
          <View
            style={{
              width: PHOTO_CONTAINER_WIDTH,
              height: PHOTO_CONTAINER_HEIGHT,
              marginTop: FRAME_EDGE_PADDING,
              marginHorizontal: FRAME_EDGE_PADDING,
            }}
            className="overflow-hidden"
          >
            {/* Photo itself - will scale to fit the container */}
            {photoUri ? (
              <Image
                source={{ uri: photoUri }}
                style={{
                  width: '100%',
                  height: '100%',
                }}
                resizeMode="contain"
              />
            ) : null}
          </View>

          {/* Bottom space - intentionally empty for future text */}
          <View style={{ height: FRAME_BOTTOM_PADDING }} />
        </View>
      </View>
    </View>
  );
} 