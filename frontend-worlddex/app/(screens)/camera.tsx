import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { useState, useRef } from "react";
import { Button, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import * as MediaLibrary from "expo-media-library";

export default function CameraScreen() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const cameraRef = useRef<CameraView>(null);

  if (!permission || !mediaPermission) {
    // Camera or media permissions are still loading
    return <View className="flex-1 bg-background" />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <Text className="text-center text-text-primary font-lexend-medium mb-4">
          We need your permission to show the camera
        </Text>
        <Button onPress={requestPermission} title="Grant camera permission" />
      </View>
    );
  }

  if (!mediaPermission.granted) {
    // Media library permissions are not granted yet
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <Text className="text-center text-text-primary font-lexend-medium mb-4">
          We need your permission to save photos
        </Text>
        <Button onPress={requestMediaPermission} title="Grant media permission" />
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing(current => (current === "back" ? "front" : "back"));
  }

  async function takePicture() {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        if (photo) {
          await MediaLibrary.saveToLibraryAsync(photo.uri);
          console.log("Photo saved to library:", photo.uri);
        }
      } catch (error) {
        console.error("Error taking picture:", error);
      }
    }
  }

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <CameraView
        ref={cameraRef}
        className="flex-1"
        facing={facing}
        style={StyleSheet.absoluteFillObject}
      >
        <View className="flex-1 flex-row justify-center items-end mb-12">
          <TouchableOpacity
            className="bg-white rounded-full p-6 mr-6"
            onPress={takePicture}
          >
            <View className="w-12 h-12 rounded-full border-4 border-background" />
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-black/50 rounded-full p-4 self-end"
            onPress={toggleCameraFacing}
          >
            <Text className="text-white font-lexend-medium">Flip Camera</Text>
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
} 