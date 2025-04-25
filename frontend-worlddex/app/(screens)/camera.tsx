import React, { useRef, useState, useCallback, useEffect } from "react";
import { View, Button, Text, Dimensions, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import * as ImageManipulator from "expo-image-manipulator";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import CameraCapture, { CameraCaptureHandle } from "../components/camera/CameraCapture";
import PolaroidDevelopment from "../components/camera/PolaroidDevelopment";
import CameraOnboarding from "../components/camera/CameraOnboarding";
import { useIdentify } from "../../src/hooks/useIdentify";
import { usePhotoUpload } from "../../src/hooks/usePhotoUpload";
import { useAuth } from "../../src/contexts/AuthContext";
import { useItems } from "../../database/hooks/useItems";
import { incrementUserField, updateUserField } from "../../database/hooks/useUsers";
import { useUser } from "../../database/hooks/useUsers";
import type { Capture } from "../../database/types";
import { useActiveCollections } from "../../database/hooks/useUserCollections";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface CameraScreenProps {
  capturesButtonClicked?: boolean;
}

export default function CameraScreen({ capturesButtonClicked = false }: CameraScreenProps) {
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
  const {
    identify,
    tier1, tier2,
    isLoading: idLoading,
    error: idError,
    reset
  } = useIdentify();
  const { uploadCapturePhoto, isUploading: isUploadingPhoto, error: uploadError } = usePhotoUpload();
  const { session } = useAuth();
  const { user, updateUser } = useUser(session?.user?.id || null);
  const { items, incrementOrCreateItem } = useItems();
  const [vlmCaptureSuccess, setVlmCaptureSuccess] = useState<boolean | null>(null);
  const [identifiedLabel, setIdentifiedLabel] = useState<string | null>(null);
  const isRejectedRef = useRef(false);
  const [resetCounter, setResetCounter] = useState(0);
  // Add state to track whether identification is fully complete (both tiers if applicable)
  const [identificationComplete, setIdentificationComplete] = useState(false);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasCapture, setHasCapture] = useState(false);
  const [showingCaptureReview, setShowingCaptureReview] = useState(false);

  // Add a state for tracking public/private status
  const [isCapturePublic, setIsCapturePublic] = useState(false);

  // Get active collections for the current user
  const { activeCollections, loading: collectionsLoading } = useActiveCollections(session?.user?.id || null);

  const handleOnboardingReset = useCallback(() => {
    setResetCounter((n) => n + 1);   // new key → unmount + mount
  }, []);

  // Check if onboarding should be shown
  useEffect(() => {
    if (user && !user.is_onboarded) {
      setShowOnboarding(true);
    }
  }, [user]);

  // Handle onboarding completion
  const handleOnboardingComplete = useCallback(async () => {
    setShowOnboarding(false);

    // Update user record if we have a session
    if (session?.user?.id) {
      try {
        await updateUser({ is_onboarded: true });
      } catch (error) {
        console.error("Failed to update onboarding status:", error);
      }
    }
  }, [session, updateUser]);

  // Track when a capture review is shown or dismissed
  useEffect(() => {
    setShowingCaptureReview(isCapturing && capturedUri !== null);
    // Set hasCapture to true when capture is initiated
    if (isCapturing && capturedUri !== null) {
      setHasCapture(true);
    }
  }, [isCapturing, capturedUri]);

  // Two–tier ID -----------------------------------------------
  useEffect(() => {
    console.log("==== TIER RESULTS UPDATED ====");
    console.log("Tier1:", tier1 ? JSON.stringify(tier1) : "null");
    console.log("Tier2:", tier2 ? JSON.stringify(tier2) : "null");
    
    // Tier-2 overrides Tier-1 if it exists
    const label = tier2?.label ?? tier1?.label ?? null;
    console.log("Selected label for display:", label);
    
    if (label) {
      setIdentifiedLabel(label);
      setVlmCaptureSuccess(true);
      console.log("Updated identifiedLabel state:", label);
      
      // If we have tier2 result or tier1 result with status "done" (no tier2 needed)
      // then identification is complete
      if (tier2 || (tier1 && !idLoading)) {
        console.log("Identification is now complete");
        setIdentificationComplete(true);
      }
    }
  }, [tier1, tier2, idLoading]);

  const handleCapture = useCallback(async (
    points: { x: number; y: number }[],
    cameraRef: React.RefObject<CameraView>
  ) => {
    if (!cameraRef.current || points.length < 3) return;

    // Check if user has reached their daily capture limit
    if (user && user.daily_captures_used >= 11) {
      Alert.alert(
        "Daily Limit Reached",
        "You have used up all of your daily captures! They will reset at midnight PST.",
        [{ text: "OK", style: "default" }]
      );
      // Make sure to reset the lasso before returning
      cameraCaptureRef.current?.resetLasso();
      return;
    }

    // Reset VLM state for new capture
    setVlmCaptureSuccess(null);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        base64: true, // Need base64 for VLM
        skipProcessing: false
      });

      // Start capture state - freeze UI
      setIsCapturing(true);

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

      // Store the captured URI for the animation
      setCapturedUri(manipResult.uri);

      // VLM Identification
      if (manipResult.base64) {
        try {
          // Use new identify function instead of identifyPhoto
          await identify({
            base64Data: manipResult.base64,
            contentType: "image/jpeg",
            activeCollections: activeCollections,
            gps: null
          });
          
          // success/failure will be set by the useEffect above
        } catch (idError) {
          console.error("VLM Identification API Error:", idError);
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
      setVlmCaptureSuccess(null);
      setIdentifiedLabel(null);
    }
  }, [identify, tier1, tier2, user, activeCollections]);

  // Handle full screen capture
  const handleFullScreenCapture = useCallback(async () => {
    if (!cameraCaptureRef.current) return;

    // Check if user has reached their daily capture limit
    if (user && user.daily_captures_used >= 11) {
      Alert.alert(
        "Daily Limit Reached",
        "You have used up all of your daily captures! They will reset at midnight PST.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    // Reset VLM state for new capture
    setVlmCaptureSuccess(null);
    setIdentifiedLabel(null);

    // Start capture state - freeze UI
    setIsCapturing(true);

    const cameraRef = cameraCaptureRef.current.getCameraRef();

    if (!cameraRef.current) {
      setIsCapturing(false);
      return;
    }

    try {
      // Take a photo of the entire screen
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        base64: true,
        skipProcessing: false
      });

      if (!photo) {
        throw new Error("Failed to capture photo");
      }

      // Set full screen capture box dimensions to allow for polaroid animation
      // Center the capture box on the screen
      setCaptureBox({
        x: SCREEN_WIDTH * 0.1,
        y: SCREEN_HEIGHT * 0.2,
        width: SCREEN_WIDTH * 0.8,
        height: SCREEN_WIDTH * 0.8, // Make it square by default
        aspectRatio: 1
      });

      // Store the captured URI for the animation
      setCapturedUri(photo.uri);

      // VLM Identification with the full photo
      if (photo.base64) {
        try {
          // Use new identify function instead of identifyPhoto
          await identify({
            base64Data: photo.base64,
            contentType: "image/jpeg",
            activeCollections: activeCollections,
            gps: null
          });

          // success/failure will be set by the useEffect above
        } catch (vlmApiError) {
          console.error("VLM Identification API Error:", vlmApiError);
          setVlmCaptureSuccess(false);
        }
      } else {
        console.warn("No base64 data available for VLM identification.");
        setVlmCaptureSuccess(false);
      }
    } catch (error) {
      console.error("Error capturing full screen:", error);
      setIsCapturing(false);
      setCapturedUri(null);
      setVlmCaptureSuccess(null);
      setIdentifiedLabel(null);
    }
  }, [identify, tier1, tier2, user, SCREEN_HEIGHT, SCREEN_WIDTH, activeCollections]);

  // Handle dismiss of the preview
  const handleDismissPreview = useCallback(async () => {
    if (capturedUri && session && !isRejectedRef.current) {
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
          image_key: "",
          is_public: isCapturePublic,
          like_count: 0,
          daily_upvotes: 0
        };

        await uploadCapturePhoto(
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

    // Reset all states regardless of whether it was accepted or rejected
    setIsCapturing(false);
    setCapturedUri(null);
    cameraCaptureRef.current?.resetLasso();
    setVlmCaptureSuccess(null);
    setIdentifiedLabel(null);
    setIsCapturePublic(true); // Reset to default
    isRejectedRef.current = false;
  }, [capturedUri, session, identifiedLabel, uploadCapturePhoto, reset, incrementOrCreateItem]);

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
          onFullScreenCapture={handleFullScreenCapture}
        />

        {/* Polaroid development and animation overlay */}
        {isCapturing && capturedUri && (
          <PolaroidDevelopment
            photoUri={capturedUri}
            captureBox={captureBox}
            onDismiss={handleDismissPreview}
            captureSuccess={vlmCaptureSuccess}
            isIdentifying={idLoading}
            label={identifiedLabel ?? ""}
            onReject={() => {
              // Mark as rejected so handleDismissPreview won't save it
              isRejectedRef.current = true;
            }}
            onSetPublic={setIsCapturePublic}
            identificationComplete={identificationComplete}
          />
        )}

        {/* Camera onboarding overlay */}
        {showOnboarding && (
          <CameraOnboarding
            key={resetCounter}
            onComplete={handleOnboardingComplete}
            capturesButtonClicked={capturesButtonClicked}
            hasCapture={hasCapture}
            showingCaptureReview={showingCaptureReview}
            captureLabel={identifiedLabel ?? ""}
            onRequestReset={handleOnboardingReset}
          />
        )}

      </View>
    </GestureHandlerRootView>
  );
}