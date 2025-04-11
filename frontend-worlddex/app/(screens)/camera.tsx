import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { useState, useRef, useCallback, useMemo } from "react";
import { Button, Text, TouchableOpacity, View, StyleSheet, Platform } from "react-native";
import * as MediaLibrary from "expo-media-library";
import { Ionicons } from "@expo/vector-icons";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, { useAnimatedProps } from "react-native-reanimated";
import { useRouter } from "expo-router";

const AnimatedCamera = Animated.createAnimatedComponent(CameraView);

export default function CameraScreen() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();

  // Zoom state
  const [zoom, setZoom] = useState(0);
  const [lastZoom, setLastZoom] = useState(0);

  const cameraAnimatedProps = useAnimatedProps(() => {
    return {
      zoom: zoom,
    };
  });

  // Pinch gesture handler using runOnJS
  const pinchGesture = useMemo(
    () => Gesture.Pinch()
      .runOnJS(true)
      .onUpdate((event) => {
        const velocity = event.velocity / 15;
        const outFactor = lastZoom * (Platform.OS === 'ios' ? 50 : 25);

        let newZoom =
          velocity > 0
            ? zoom + event.scale * velocity * (Platform.OS === 'ios' ? 0.02 : 35)
            : zoom - (event.scale * (outFactor || 1)) * Math.abs(velocity) * (Platform.OS === 'ios' ? 0.035 : 60);

        if (newZoom < 0) newZoom = 0;
        else if (newZoom > 0.9) newZoom = 0.9;

        setZoom(newZoom);
      })
      .onEnd(() => {
        setLastZoom(zoom);
      }),
    [zoom, lastZoom]
  );

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
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync();

      if (photo) {
        await MediaLibrary.saveToLibraryAsync(photo.uri);
        console.log("Photo saved to library:", photo.uri);

        // Navigate to the photo preview
        router.push({
          pathname: "/(screens)/photo-preview",
          params: { photoUri: photo.uri }
        });
      }
    } catch (error) {
      console.error("Error taking picture:", error);
    }
  }

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <GestureDetector gesture={pinchGesture}>
        <Animated.View style={StyleSheet.absoluteFillObject}>
          <AnimatedCamera
            ref={cameraRef}
            style={StyleSheet.absoluteFillObject}
            facing={facing}
            animatedProps={cameraAnimatedProps}
          >
            {/* Flip camera button - top right */}
            <TouchableOpacity
              className="absolute top-12 right-6"
              onPress={toggleCameraFacing}
            >
              <Ionicons name="sync-outline" size={28} color="#FFF4ED" />
            </TouchableOpacity>

            {/* Capture button - bottom center */}
            <View className="absolute bottom-12 left-0 right-0 flex items-center">
              <TouchableOpacity
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  borderWidth: 4,
                  borderColor: "#FFF4ED",
                  justifyContent: "center",
                  alignItems: "center"
                }}
                onPress={takePicture}
              />
            </View>
          </AnimatedCamera>
        </Animated.View>
      </GestureDetector>
    </View>
  );
} 