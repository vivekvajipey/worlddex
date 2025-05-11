import React, { useRef, useState, useCallback, useEffect } from "react";
import { View, Button, Text, Dimensions, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import * as ImageManipulator from "expo-image-manipulator";
import * as Location from "expo-location";
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
import type { Capture, CollectionItem } from "../../database/types";
import { calculateAndAwardCoins } from "../../database/hooks/useCoins";
import CoinRewardModal from "../components/CoinRewardModal";
import { fetchCollectionItems } from "../../database/hooks/useCollectionItems";
import {
  createUserCollectionItem,
  checkUserHasCollectionItem
} from "../../database/hooks/useUserCollectionItems";
import { fetchUserCollectionsByUser } from "../../database/hooks/useUserCollections";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface CameraScreenProps {
  capturesButtonClicked?: boolean;
}

export default function CameraScreen({ capturesButtonClicked = false }: CameraScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();
  const cameraCaptureRef = useRef<CameraCaptureHandle>(null);

  // Photo capture state
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [captureBox, setCaptureBox] = useState({
    x: 0, y: 0, width: 0, height: 0, aspectRatio: 1
  });

  // Location state
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

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

  // Add state for coin reward modal
  const [coinModalVisible, setCoinModalVisible] = useState(false);
  const [coinModalData, setCoinModalData] = useState<{ total: number; rewards: { amount: number; reason: string }[] }>({ total: 0, rewards: [] });

  const handleOnboardingReset = useCallback(() => {
    setResetCounter((n) => n + 1);   // new key → unmount + mount
  }, []);

  // Request location permission after camera permission
  useEffect(() => {
    if (permission?.granted && !locationPermission?.granted) {
      requestLocationPermission();
    }
  }, [permission?.granted, locationPermission]);

  // Get location when permission is granted
  useEffect(() => {
    const getLocation = async () => {
      if (!locationPermission?.granted) return;

      try {
        setLocationError(null);
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });

        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude
        });
        console.log("Location fetched successfully:", currentLocation.coords);
      } catch (error) {
        console.error("Error getting location:", error);
        setLocationError("Could not get location");
        setLocation(null);
      }
    };

    getLocation();
  }, [locationPermission?.granted]);

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
    console.log("==== TIER RESULTS UPDATED (camera.tsx hook) ====");
    const currentTier1 = tier1;
    const currentTier2 = tier2;
    const currentIdLoading = idLoading;

    console.log("Current Tier1:", currentTier1 ? JSON.stringify(currentTier1) : "null");
    console.log("Current Tier2:", currentTier2 ? JSON.stringify(currentTier2) : "null");
    console.log("Current idLoading:", currentIdLoading);

    // Tier-2 overrides Tier-1 if it exists
    const label = currentTier2?.label ?? currentTier1?.label ?? null;
    console.log("Selected label for display:", label);

    if (label) {
      setIdentifiedLabel(label);
      setVlmCaptureSuccess(true);
      console.log("Updated identifiedLabel state:", label);

      // If we have tier2 result or tier1 result with status "done" (no tier2 needed)
      // then identification is complete
      if (currentTier2 || (currentTier1 && !currentIdLoading)) {
        console.log("Identification is now complete (SUCCESS).");
        setIdentificationComplete(true);
      } else if (currentIdLoading) {
        // Still loading (e.g. tier1 received, waiting for potential tier2)
        // Keep identificationComplete as is or set to false if it wasn't already processing a multi-tier result
        console.log("Have a label, but still loading (potentially waiting for Tier2). Identification NOT YET fully complete.");
        // setIdentificationComplete(false); // Explicitly false if we expect more
      }
    } else {
      // No label found
      if (!currentIdLoading) {
        // Identification attempt is finished (not loading anymore) and no label was found
        console.log("Identification is now complete (FAILURE - no label found).");
        setIdentifiedLabel(null);    // Ensure it's null
        setVlmCaptureSuccess(false); // Mark as unsuccessful
        setIdentificationComplete(true); // Identification process is complete
      } else {
        // Still loading, and no label yet. VLM might still be processing.
        console.log("No label yet, and still loading. Waiting for VLM response.");
        // Do not change vlmCaptureSuccess from its initial null state yet (should be null).
        // Do not change identifiedLabel yet.
        // setIdentificationComplete(false); // Mark as not complete while loading
      }
    }
  }, [tier1, tier2, idLoading]);

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
      // Make sure to reset the lasso before returning
      cameraCaptureRef.current?.resetLasso();
      return;
    }

    // Reset VLM state for new capture
    setVlmCaptureSuccess(null);
    setIdentifiedLabel(null);
    setIdentificationComplete(false);

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
          // Format location data for the API
          const gpsData = location ? {
            lat: location.latitude,
            lng: location.longitude
          } : null;

          console.log("Sending location with capture:", gpsData);

          // Use new identify function instead of identifyPhoto
          await identify({
            base64Data: manipResult.base64,
            contentType: "image/jpeg",
            gps: gpsData
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
  }, [identify, tier1, tier2, user, location]);

  // Handle full screen capture
  const handleFullScreenCapture = useCallback(async () => {
    if (!cameraCaptureRef.current) return;

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
    setVlmCaptureSuccess(null);
    setIdentifiedLabel(null);
    setIdentificationComplete(false);

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
          // Format location data for the API
          const gpsData = location ? {
            lat: location.latitude,
            lng: location.longitude
          } : null;

          console.log("Sending location with full screen capture:", gpsData);

          // Use new identify function instead of identifyPhoto
          await identify({
            base64Data: photo.base64,
            contentType: "image/jpeg",
            gps: gpsData
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
  }, [identify, tier1, tier2, user, SCREEN_HEIGHT, SCREEN_WIDTH, location]);

  // Handle dismiss of the preview
  const handleDismissPreview = useCallback(async () => {
    console.log("==== handleDismissPreview called ====");
    console.log("Current state: identificationComplete:", identificationComplete, "vlmCaptureSuccess:", vlmCaptureSuccess, "identifiedLabel:", identifiedLabel, "isRejectedRef.current:", isRejectedRef.current);

    // Only proceed if identification is complete, was successful, a label exists,
    // there's a captured URI, a session, and the user didn't explicitly reject it.
    if (
      identificationComplete &&
      vlmCaptureSuccess === true && // Explicitly check for true
      identifiedLabel &&
      capturedUri &&
      session &&
      !isRejectedRef.current
    ) {
      console.log("Proceeding with capture save logic.");
      try {
        const label = identifiedLabel; // Already checked it's not null

        const item = await incrementOrCreateItem(label);
        if (!item) {
          console.warn(`Failed to create or increment item for label: ${label}`);
          // Don't throw here, allow cleanup to happen, but log it as a more critical error.
          // Consider if this case needs specific user feedback or just backend logging.
          console.error("Critical: No matching item found or created for label:", label);
          // Fall through to cleanup.
        } else {
          // Proceed with creating the capture record only if item was successfully obtained
          const capturePayload: Omit<Capture, "id" | "captured_at" | "segmented_image_key"> = {
            user_id: session.user.id,
            item_id: item.id,
            item_name: item.name,
            capture_number: item.total_captures,
            image_key: "", // This will be set by uploadCapturePhoto
            is_public: isCapturePublic,
            like_count: 0,
            daily_upvotes: 0
          };

          const captureRecord = await uploadCapturePhoto(
            capturedUri,
            "image/jpeg",
            `${Date.now()}.jpg`,
            capturePayload
          );

          // Auto-add to user collections based on the identified label
          if (captureRecord && identifiedLabel) { // Re-check identifiedLabel for safety, though it should be set
            console.log("Checking if capture matches any collection items...");

            try {
              // Get all user collections
              const userCollections = await fetchUserCollectionsByUser(session.user.id);
              console.log(`Found ${userCollections.length} user collections to check`);

              // For each collection, find matching items
              for (const userCollection of userCollections) {
                // Get all items in this collection
                const collectionItems = await fetchCollectionItems(userCollection.collection_id);
                console.log(`Collection ${userCollection.collection_id} has ${collectionItems.length} items`);

                // Filter items that match the identified label
                const matchingItems = collectionItems.filter((ci: CollectionItem) => { // Explicitly type ci
                  const itemNameMatch = ci.name?.toLowerCase() === identifiedLabel.toLowerCase();
                  const displayNameMatch = ci.display_name?.toLowerCase() === identifiedLabel.toLowerCase();
                  return itemNameMatch || displayNameMatch;
                });

                console.log(`Found ${matchingItems.length} matching items in collection ${userCollection.collection_id}`);

                // Add matching items to user's collection
                for (const collectionItem of matchingItems) { // Renamed to avoid conflict
                  try {
                    // Check if the user already has this item to avoid duplicates
                    const hasItem = await checkUserHasCollectionItem(session.user.id, collectionItem.id);

                    if (!hasItem) {
                      await createUserCollectionItem({
                        user_id: session.user.id,
                        collection_item_id: collectionItem.id,
                        capture_id: captureRecord.id,
                        collection_id: collectionItem.collection_id,
                      });
                      console.log(`Added ${identifiedLabel} to collection ${collectionItem.collection_id}`);
                    } else {
                      console.log(`User already has item ${collectionItem.id} in their collection`);
                    }
                  } catch (collectionErr) {
                    console.error("Error adding item to user collection:", collectionErr);
                    // Continue with next item even if this one fails
                  }
                }
              }
            } catch (collectionErr) {
              console.error("Error handling collections:", collectionErr);
            }
          }

          // Increment daily_captures_used for the user
          await incrementUserField(session.user.id, "daily_captures_used", 1);

          // Calculate and award coins
          const { total: coinsAwarded, rewards } = await calculateAndAwardCoins(session.user.id);
          if (coinsAwarded > 0) {
            setCoinModalData({ total: coinsAwarded, rewards });
            setCoinModalVisible(true);
          }
        }
      } catch (err) {
        // This catch block now primarily handles errors from uploadCapturePhoto, incrementUserField, calculateAndAwardCoins, etc.
        // The "Missing label" error should be prevented by the checks above.
        console.error("Error during capture processing (upload, collections, coins):", err);
        // Optionally, provide user feedback about the failure if it's not already handled.
      }
    } else {
      // Log why we are not proceeding
      if (isRejectedRef.current) {
        console.log("Not proceeding with save: User rejected the capture.");
      } else if (!identificationComplete) {
        console.log("Not proceeding with save: Identification not complete.");
      } else if (vlmCaptureSuccess !== true) {
        console.log("Not proceeding with save: VLM capture was not successful.");
      } else if (!identifiedLabel) {
        console.log("Not proceeding with save: No identified label.");
      } else if (!capturedUri) {
        console.log("Not proceeding with save: No captured URI.");
      } else if (!session) {
        console.log("Not proceeding with save: No active session.");
      }
    }

    // Reset all states regardless of whether it was accepted or rejected, or if processing happened
    console.log("Resetting states in handleDismissPreview.");
    setIsCapturing(false);
    setCapturedUri(null);
    cameraCaptureRef.current?.resetLasso();
    setVlmCaptureSuccess(null);
    setIdentifiedLabel(null);
    setIdentificationComplete(false); // Reset for the next capture cycle
    setIsCapturePublic(true); // Reset to default public status
    isRejectedRef.current = false; // Reset rejection flag

    // Reset the useIdentify hook's internal state if a reset function is available
    if (reset) {
      console.log("Calling reset on useIdentify hook.");
      reset();
    }
  }, [
    capturedUri,
    session,
    identifiedLabel,
    uploadCapturePhoto,
    reset, // Add reset to dependency array
    incrementOrCreateItem,
    isCapturePublic, // Add to dependency array
    identificationComplete, // Add to dependency array
    vlmCaptureSuccess, // Add to dependency array
    // Dependencies for collection logic
    fetchUserCollectionsByUser,
    fetchCollectionItems,
    checkUserHasCollectionItem,
    createUserCollectionItem,
    // Dependencies for coin logic
    calculateAndAwardCoins,
    // Dependencies for user field updates
    incrementUserField
  ]);

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

  // Location permission UI (optional)
  if (!locationPermission?.granted) {
    // Continue without location, but show a message
    console.log("Location permission not granted. Some features may be limited.");
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

        <CoinRewardModal
          visible={coinModalVisible}
          onClose={() => setCoinModalVisible(false)}
          total={coinModalData.total}
          rewards={coinModalData.rewards}
        />

      </View>
    </GestureHandlerRootView>
  );
}