import React, { useRef, useState, useCallback, useEffect } from "react";
import { View, Button, Text, Dimensions, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import * as ImageManipulator from "expo-image-manipulator";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useRouter } from "expo-router";

import CameraCapture, { CameraCaptureHandle } from "../components/camera/CameraCapture";
import PolaroidDevelopment from "../components/camera/PolaroidDevelopment";
import { useVlmIdentify } from "../../src/hooks/useVlmIdentify";
import { usePhotoUpload } from "../../src/hooks/usePhotoUpload";
import { useAuth } from "../../src/contexts/AuthContext";
import { useItems } from "../../database/hooks/useItems";
import { incrementUserField } from "../../database/hooks/useUsers";
import { useUser } from "../../database/hooks/useUsers";
import type { Capture } from "../../database/types";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const cameraCaptureRef = useRef<CameraCaptureHandle>(null);

  // Photo capture state
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [captureBox, setCaptureBox] = useState({
    x: 0, y: 0, width: 0, height: 0, aspectRatio: 1
  });

  // VLM
  const { identifyPhoto, isLoading: vlmLoading, error: vlmError, reset: resetVlm } = useVlmIdentify();
  const { uploadPhoto, isUploading: isUploadingPhoto, error: uploadError } = usePhotoUpload();
  const { session } = useAuth();
  const { user } = useUser(session?.user?.id || null);
  const { items, incrementOrCreateItem } = useItems();
  const [vlmCaptureSuccess, setVlmCaptureSuccess] = useState<boolean | null>(null);
  const [identifiedLabel, setIdentifiedLabel] = useState<string | null>(null);

  const router = useRouter();

  const handleCapture = useCallback(async (
    points: { x: number; y: number }[],
    cameraRef: React.RefObject<CameraView>
  ) => {
    if (!cameraRef.current || points.length < 3) return;

    // Check if user has reached their daily capture limit
    if (user && user.daily_captures_used >= 10) {
      Alert.alert(
        "Daily Limit Reached",
        "You have used up all of your daily captures! They will reset at midnight PST.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    // Reset VLM state for new capture
    resetVlm();
    setVlmCaptureSuccess(null);

    // Start capture state - freeze UI
    setIsCapturing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        base64: true, // Need base64 for VLM
        skipProcessing: false
      });

      if (!photo) {
        throw new Error("Failed to capture photo");
      }

      // Calculate the image scale factor (photo dimensions vs screen dimensions)
      const scaleX = photo.width / SCREEN_WIDTH;
      const scaleY = photo.height / SCREEN_HEIGHT;

      // Calculate bounding box of the selection, scaling coordinates to match the photo
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      for (const point of points) {
        // Scale screen coordinates to photo coordinates
        const scaledX = point.x * scaleX;
        const scaledY = point.y * scaleY;

        minX = Math.min(minX, scaledX);
        minY = Math.min(minY, scaledY);
        maxX = Math.max(maxX, scaledX);
        maxY = Math.max(maxY, scaledY);
      }

      // Add padding
      const padding = 10;
      minX = Math.max(0, minX - padding);
      minY = Math.max(0, minY - padding);
      maxX = Math.min(photo.width, maxX + padding);
      maxY = Math.min(photo.height, maxY + padding);

      // Calculate crop dimensions
      const cropWidth = maxX - minX;
      const cropHeight = maxY - minY;
      const aspectRatio = cropWidth / cropHeight;

      // Store the capture box info for animation
      setCaptureBox({
        x: minX / scaleX,
        y: minY / scaleY,
        width: cropWidth / scaleX,
        height: cropHeight / scaleY,
        aspectRatio
      });

      // Ensure we have a valid crop area - use a smaller minimum size
      // Some devices might have different pixel densities causing small lasso to be below threshold
      if (cropWidth < 5 || cropHeight < 5) {
        throw new Error("Selection area too small");
      }

      // Crop the image
      const manipResult = await ImageManipulator.manipulateAsync(
        photo.uri,
        [
          {
            crop: {
              originX: minX,
              originY: minY,
              width: cropWidth,
              height: cropHeight,
            },
          },
        ],
        { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      // Save cropped image
      await MediaLibrary.saveToLibraryAsync(manipResult.uri);

      // Store the captured URI for the animation
      setCapturedUri(manipResult.uri);

      // VLM Identification
      if (manipResult.base64) {
        console.log("Sending cropped image for VLM identification...");
        try {
          const vlmResult = await identifyPhoto({
            base64Data: manipResult.base64,
            contentType: "image/jpeg"
          });
          console.log("VLM Identification Result:", vlmResult);
          if (vlmResult?.label) {
            setVlmCaptureSuccess(true);
            setIdentifiedLabel(vlmResult.label);
          } else {
            setVlmCaptureSuccess(false);
            setIdentifiedLabel(null);
          }
        } catch (vlmApiError) {
          console.error("VLM Identification API Error:", vlmApiError);
          setVlmCaptureSuccess(false);
        }
      } else {
        console.warn("No base64 data available for VLM identification.");
        setVlmCaptureSuccess(false); // Treating missing base64 as capture failure
      }
      // ----------------------------------------------------

    } catch (error) {
      console.error("Error capturing selected area:", error);
      setIsCapturing(false);
      setCapturedUri(null);
      cameraCaptureRef.current?.resetLasso();
      resetVlm();
      setVlmCaptureSuccess(null);
    }
  }, [identifyPhoto, resetVlm, user]);

  // Handle dismiss of the preview
  const handleDismissPreview = useCallback(async () => {
    if (capturedUri && session) {
      try {
        const label = identifiedLabel;
        if (!label) throw new Error("Missing label for capture");

        const item = await incrementOrCreateItem(label);
        if (!item) {
          console.warn(`Failed to create or increment item for label: ${label}`);
          throw new Error("No matching item");
        }

        const capturePayload: Omit<Capture, "id" | "captured_at" | "segmented_image_key"> = {
          user_id: session.user.id,
          item_id: item.id,
          item_name: item.name,
          capture_number: item.total_captures,
          image_key: ""
        };

        await uploadPhoto(
          capturedUri,
          "image/jpeg",
          `${Date.now()}.jpg`,
          capturePayload
        );

        // Increment daily_captures_used for the user
        await incrementUserField(session.user.id, "daily_captures_used", 1);
      } catch (err) {
        console.error("Upload failed:", err);
      }
    }
    setIsCapturing(false);
    setCapturedUri(null);
    cameraCaptureRef.current?.resetLasso();
    resetVlm();
    setVlmCaptureSuccess(null);
    setIdentifiedLabel(null);
  }, [capturedUri, session, identifiedLabel, uploadPhoto, resetVlm, incrementOrCreateItem]);

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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1">
        {/* Camera capture component */}
        <CameraCapture
          ref={cameraCaptureRef}
          onCapture={handleCapture}
          isCapturing={isCapturing}
        />

        {/* Polaroid development and animation overlay */}
        {isCapturing && capturedUri && (
          <PolaroidDevelopment
            photoUri={capturedUri}
            captureBox={captureBox}
            onDismiss={handleDismissPreview}
            captureSuccess={vlmCaptureSuccess}
            label={identifiedLabel || ""}
          />
        )}
      </View>
    </GestureHandlerRootView>
  );
}