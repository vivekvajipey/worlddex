import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { useState, useRef } from "react";
import { View, StyleSheet } from "react-native";
import * as MediaLibrary from "expo-media-library";
import Animated from "react-native-reanimated";
import { GestureDetector } from "react-native-gesture-handler";
import { useVlmIdentify } from "../../src/hooks/useVlmIdentify";

// Import extracted components
import { FeedbackOverlay } from "../../src/components/camera/FeedbackOverlay";
import { CameraControls } from "../../src/components/camera/CameraControls";
import { PermissionRequest } from "../../src/components/camera/PermissionRequest";

// Import custom hooks
import { useCameraZoom } from "../../src/hooks/useCameraZoom";
import { useCameraCapture } from "../../src/hooks/useCameraCapture";

// Import types
import { IdentificationStatus } from "../../src/types/camera";

const AnimatedCamera = Animated.createAnimatedComponent(CameraView);

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

  // Use custom hooks
  const { cameraAnimatedProps, pinchGesture } = useCameraZoom();
  const { captureAndIdentify } = useCameraCapture({
    cameraRef,
    identifyPhoto,
    setIdentificationStatus
  });

  // Toggle camera facing
  const toggleCameraFacing = () => {
    setFacing(current => (current === "back" ? "front" : "back"));
  };

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
