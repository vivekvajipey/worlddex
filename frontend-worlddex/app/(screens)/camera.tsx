import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { useState, useRef, useCallback, useMemo } from "react";
import { Button, Text, TouchableOpacity, View, StyleSheet, Platform, ActivityIndicator } from "react-native";
import * as MediaLibrary from "expo-media-library";
import { Ionicons } from "@expo/vector-icons";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, { useAnimatedProps } from "react-native-reanimated";
import { useVlmIdentify } from "../../src/hooks/useVlmIdentify";

const AnimatedCamera = Animated.createAnimatedComponent(CameraView);

export default function CameraScreen() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const cameraRef = useRef<CameraView>(null);
  
  const { identifyPhoto, isLoading: isIdentifying, error: identifyError, result: identifyResult } = useVlmIdentify();
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

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

  async function takePictureAndIdentify() {
    if (cameraRef.current) {
      setFeedbackMessage(null);
      
      try {
        // Take picture with base64 data for identification
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7, // TODO: test and optimize
          base64: true
        });
        
        if (!photo) {
          console.error("Failed to capture photo");
          setFeedbackMessage("Failed to capture photo");
          return;
        }

        if (photo.uri) {
          await MediaLibrary.saveToLibraryAsync(photo.uri);
          console.log("Photo saved to library:", photo.uri);
        }
        
        if (photo.base64) {
          setFeedbackMessage("Identifying...");
          const contentType = "image/jpeg";
          
          try {
            const result = await identifyPhoto({ base64Data: photo.base64, contentType });
            setFeedbackMessage(`Identified: ${result.label || "Unknown"}`);
          } catch (identifyError: any) {
            console.error("Error identifying image:", identifyError);
            setFeedbackMessage(`Error: ${identifyError.message || "Failed to identify"}`);
          }
        }
      } catch (error) {
        console.error("Error taking picture:", error);
        setFeedbackMessage("Error capturing image");
      }
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
            {/* Feedback display - top center */}
            {feedbackMessage && (
              <View className="absolute top-12 left-5 right-5 bg-black/40 rounded-lg p-2 items-center">
                {isIdentifying ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator size="small" color="#FFF4ED" />
                    <Text className="text-white font-lexend-regular ml-2">{feedbackMessage}</Text>
                  </View>
                ) : (
                  <Text className="text-white font-lexend-medium text-center">{feedbackMessage}</Text>
                )}
              </View>
            )}
            
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
                className="w-20 h-20 rounded-full border-4 border-background justify-center items-center"
                style={{
                  opacity: isIdentifying ? 0.7 : 1,
                }}
                onPress={takePictureAndIdentify}
                disabled={isIdentifying}
              >
                <View className="w-16 h-16 bg-white/80 rounded-full" />
              </TouchableOpacity>
            </View>
          </AnimatedCamera>
        </Animated.View>
      </GestureDetector>
    </View>
  );
} 