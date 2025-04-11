import React from "react";
import { View, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function PhotoPreview() {
  const { photoUri } = useLocalSearchParams<{ photoUri: string }>();
  const router = useRouter();

  const handleClose = () => {
    router.back();
  };

  return (
    <View style={StyleSheet.absoluteFillObject}>
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="contain"
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#000" }]} />
      )}

      {/* X button to return to camera */}
      <TouchableOpacity
        className="absolute top-12 right-6 z-10"
        onPress={handleClose}
      >
        <Ionicons name="close" size={32} color="#FFF4ED" />
      </TouchableOpacity>
    </View>
  );
} 