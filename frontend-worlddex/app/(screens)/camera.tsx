import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { useState, useRef, useCallback, useMemo } from "react";
import { Button, Text, TouchableOpacity, View, StyleSheet, Platform, ActivityIndicator } from "react-native";
import * as MediaLibrary from "expo-media-library";
import { Ionicons } from "@expo/vector-icons";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, { useAnimatedProps } from "react-native-reanimated";
import { useVlmIdentify } from "../../src/hooks/useVlmIdentify";
import { styled } from "nativewind";

const AnimatedCamera = Animated.createAnimatedComponent(CameraView);

// Types for camera identification
type IdentificationStatus = {
  message: string | null;
  isLoading: boolean;
};

// Feedback overlay component
const FeedbackOverlay = ({ status }: { status: IdentificationStatus }) => {
  if (!status.message) return null;
  
  return (
    <View className="absolute top-12 left-5 right-5 bg-black/40 rounded-lg p-2 items-center">
      {status.isLoading ? (
        <View className="flex-row items-center">
          <ActivityIndicator size="small" color="#FFF4ED" />
          <Text className="text-white font-lexend-regular ml-2">{status.message}</Text>
        </View>
      ) : (
        <Text className="text-white font-lexend-medium text-center">{status.message}</Text>
      )}
    </View>
  );
};

// Camera controls component
const CameraControls = ({ 
  onFlip, 
  onCapture, 
  disabled 
}: { 
  onFlip: () => void; 
  onCapture: () => void; 
  disabled: boolean;
}) => {
  return (
    <>
      {/* Flip camera button - top right */}
      <TouchableOpacity
        className="absolute top-12 right-6"
        onPress={onFlip}
      >
        <Ionicons name="sync-outline" size={28} color="#FFF4ED" />
      </TouchableOpacity>

      {/* Capture button - bottom center */}
      <View className="absolute bottom-12 left-0 right-0 flex items-center">
        <TouchableOpacity
          className="w-20 h-20 rounded-full border-4 border-background justify-center items-center"
          style={{
            opacity: disabled ? 0.7 : 1,
          }}
          onPress={onCapture}
          disabled={disabled}
        >
          <View className="w-16 h-16 bg-white/80 rounded-full" />
        </TouchableOpacity>
      </View>
    </>
  );
};

// Permission request screen
const PermissionRequest = ({ 
  message, 
  onRequest 
}: { 
  message: string; 
  onRequest: () => void;
}) => (
  <View className="flex-1 justify-center items-center bg-background">
    <Text className="text-center text-text-primary font-lexend-medium mb-4">
      {message}
    </Text>
    <Button onPress={onRequest} title={`Grant ${message.includes("camera") ? "camera" : "media"} permission`} />
  </View>
);

export default function CameraScreen() {
  // Camera state
  const [facing, setFacing] = useState<CameraType>("back");
  const cameraRef = useRef<CameraView>(null);
  
  // Permissions
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  
  // Identification state
  const { identifyPhoto, isLoading: isIdentifying } = useVlmIdentify();
  const [identificationStatus, setIdentificationStatus] = useState<IdentificationStatus>({
    message: null,
    isLoading: false
  });

  // Zoom state
  const [zoom, setZoom] = useState(0);
  const [lastZoom, setLastZoom] = useState(0);

  const cameraAnimatedProps = useAnimatedProps(() => ({
    zoom: zoom,
  }));

  // Pinch gesture handler using runOnJS
  const pinchGesture = useMemo(
    () => Gesture.Pinch()
      .runOnJS(true)
      .onUpdate((event) => {
        const velocity = event.velocity / 15;
        const outFactor = lastZoom * (Platform.OS === "ios" ? 50 : 25);

        let newZoom =
          velocity > 0
            ? zoom + event.scale * velocity * (Platform.OS === "ios" ? 0.02 : 35)
            : zoom - (event.scale * (outFactor || 1)) * Math.abs(velocity) * (Platform.OS === "ios" ? 0.035 : 60);

        if (newZoom < 0) newZoom = 0;
        else if (newZoom > 0.9) newZoom = 0.9;

        setZoom(newZoom);
      })
      .onEnd(() => {
        setLastZoom(zoom);
      }),
    [zoom, lastZoom]
  );

  // Handle photo capture and identification
  const captureAndIdentify = useCallback(async () => {
    if (!cameraRef.current) return;
    
    setIdentificationStatus({
      message: null,
      isLoading: false
    });
    
    try {
      // Take picture with base64 data for identification
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true
      });
      
      if (!photo) {
        setIdentificationStatus({
          message: "Failed to capture photo",
          isLoading: false
        });
        return;
      }

      // Save photo to media library
      if (photo.uri) {
        await MediaLibrary.saveToLibraryAsync(photo.uri);
      }
      
      // Process identification if base64 data is available
      if (photo.base64) {
        await processIdentification(photo.base64);
      }
    } catch (error) {
      console.error("Error taking picture:", error);
      setIdentificationStatus({
        message: "Error capturing image",
        isLoading: false
      });
    }
  }, []);

  // Process image identification
  const processIdentification = async (base64Data: string) => {
    setIdentificationStatus({
      message: "Identifying...",
      isLoading: true
    });
    
    try {
      const result = await identifyPhoto({ 
        base64Data, 
        contentType: "image/jpeg" 
      });
      
      setIdentificationStatus({
        message: `Identified: ${result.label || "Unknown"}`,
        isLoading: false
      });
    } catch (error: any) {
      console.error("Error identifying image:", error);
      setIdentificationStatus({
        message: `Error: ${error.message || "Failed to identify"}`,
        isLoading: false
      });
    }
  };

  // Toggle camera facing
  const toggleCameraFacing = useCallback(() => {
    setFacing(current => (current === "back" ? "front" : "back"));
  }, []);

  // Handle permissions
  if (!permission || !mediaPermission) {
    return <View className="flex-1 bg-background" />;
  }

  if (!permission.granted) {
    return (
      <PermissionRequest 
        message="We need your permission to show the camera"
        onRequest={requestPermission}
      />
    );
  }

  if (!mediaPermission.granted) {
    return (
      <PermissionRequest 
        message="We need your permission to save photos"
        onRequest={requestMediaPermission}
      />
    );
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
            <FeedbackOverlay status={identificationStatus} />
            
            <CameraControls 
              onFlip={toggleCameraFacing}
              onCapture={captureAndIdentify}
              disabled={isIdentifying}
            />
          </AnimatedCamera>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}