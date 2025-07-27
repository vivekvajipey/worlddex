import React, { useRef, useState, useCallback, useEffect } from "react";
import { View, Button, Text, Dimensions, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import * as ImageManipulator from "expo-image-manipulator";
import * as Location from "expo-location";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";
import { usePathname } from "expo-router";

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
import { calculateAndAwardCaptureXP } from "../../database/hooks/useXP";
import CoinRewardModal from "../components/CoinRewardModal";
import LevelUpModal from "../components/LevelUpModal";
import { fetchCollectionItems } from "../../database/hooks/useCollectionItems";
import {
  createUserCollectionItem,
  checkUserHasCollectionItem
} from "../../database/hooks/useUserCollectionItems";
import { fetchUserCollectionsByUser } from "../../database/hooks/useUserCollections";
import { useImageProcessor } from "../../src/hooks/useImageProcessor";
import { IdentifyRequest } from "../../../shared/types/identify";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const MAX_IMAGE_DIMENSION = 1024; // Max dimension for VLM input
const IMAGE_COMPRESSION_LEVEL = 0.8; // JPEG compression level

interface CameraScreenProps {
  capturesButtonClicked?: boolean;
  isServerConnected?: boolean;
  isCheckingServer?: boolean;
  onRetryConnection?: () => Promise<void>;
}

export default function CameraScreen({ 
  capturesButtonClicked = false, 
  isServerConnected = true,
  isCheckingServer = false,
  onRetryConnection,
}: CameraScreenProps) {
  const posthog = usePostHog();
  const pathname = usePathname();
  const { processImageForVLM } = useImageProcessor();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();
  const cameraCaptureRef = useRef<CameraCaptureHandle>(null);
  const lastIdentifyPayloadRef = useRef<IdentifyRequest | null>(null);

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
  
  // Derive permission resolution status - no useState needed
  const permissionsResolved = 
    permission?.status != null && 
    mediaPermission?.status != null;

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasCapture, setHasCapture] = useState(false);
  const [showingCaptureReview, setShowingCaptureReview] = useState(false);

  // Add a state for tracking public/private status
  const [isCapturePublic, setIsCapturePublic] = useState(false);

  // Add state for coin reward modal
  const [coinModalVisible, setCoinModalVisible] = useState(false);
  const [coinModalData, setCoinModalData] = useState<{ 
    total: number; 
    rewards: { amount: number; reason: string }[];
    xpTotal?: number;
    xpRewards?: { amount: number; reason: string }[];
    levelUp?: boolean;
    newLevel?: number;
  }>({ total: 0, rewards: [] });
  
  // Add state for level up modal
  const [levelUpModalVisible, setLevelUpModalVisible] = useState(false);
  const [levelUpData, setLevelUpData] = useState<{ newLevel: number }>({ newLevel: 1 });

  // Add state for rarity tier
  const [rarityTier, setRarityTier] = useState<"common" | "uncommon" | "rare" | "epic" | "mythic" | "legendary">("common");
  
  // Add state for rarity score
  const [rarityScore, setRarityScore] = useState<number | undefined>(undefined);
  
  const polaroidError = vlmCaptureSuccess === true ? null : idError;
  
  const handleRetryIdentification = useCallback(async () => {
    if (!lastIdentifyPayloadRef.current) return;

    await new Promise(res => {
      reset();
      requestAnimationFrame(res);   // wait exactly one frame
    });
  
    /** 1️⃣  Check / restore connectivity first */
    if (onRetryConnection) {
      await onRetryConnection();                 // ping your API again
    }
    if (isCheckingServer) {
      Alert.alert(
        "Connecting…",
        "Please wait while we check the server connection."
      );
      return;
    }
    if (!isServerConnected) {
      Alert.alert(
        "Offline",
        "Still no internet connection. Try again once you're back online."
      );
      return;
    }
  
    /** 2  Clear local UI state */
    reset();
    setVlmCaptureSuccess(null);
    setIdentifiedLabel(null);
    setIdentificationComplete(false);
    isRejectedRef.current = false;
  
    /** 3  Fire the request again */
    try {
      await identify(lastIdentifyPayloadRef.current);
    } catch (err) {
      console.error("Retry identify failed:", err);
      setVlmCaptureSuccess(false);
      setIdentificationComplete(true);
    }
  }, [
    identify,
    reset,
    lastIdentifyPayloadRef,
    onRetryConnection,
    isCheckingServer,
    isServerConnected,
  ]);

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

  useEffect(() => {
    if (idError) {
      setVlmCaptureSuccess(false);   // tells the polaroid it's a failure
      setIdentificationComplete(true);
    }
  }, [idError]);

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

  // Handle onboarding reset
  const handleOnboardingReset = useCallback(() => {
    setResetCounter(prev => prev + 1);
  }, []);

  // Track when a capture review is shown or dismissed
  useEffect(() => {
    setShowingCaptureReview(isCapturing && capturedUri !== null);
    // Set hasCapture to true when capture is initiated
    if (isCapturing && capturedUri !== null) {
      setHasCapture(true);
    }
  }, [isCapturing, capturedUri]);

  // Update useEffect that watches for tier1 and tier2 changes
  useEffect(() => {
    console.log("==== TIER RESULTS UPDATED (camera.tsx hook) ====");
    
    // Reset on each run if we don't have any tiers yet
    if (!tier1 && !tier2) {
      setVlmCaptureSuccess(null);
      setIdentifiedLabel(null);
      setIdentificationComplete(false);
      setRarityTier("common"); // Reset rarity tier
      setRarityScore(undefined); // Reset rarity score
      return;
    }

    if (tier1 !== null) {
      // Handle tier1 successful identification
      if (tier1.label) {
        console.log("==== SETTING TIER 1 IDENTIFICATION ====");
        console.log("tier1:", tier1);
        setVlmCaptureSuccess(true);
        setIdentifiedLabel(tier1.label);
        
        // Set rarity information if available
        if (tier1.rarityTier) {
          setRarityTier(tier1.rarityTier);
          console.log("Setting rarity tier:", tier1.rarityTier);
        } else {
          console.log("No rarity tier in tier1 response, using default");
        }
        
        // Set rarity score if available
        if (tier1.rarityScore !== undefined) {
          setRarityScore(tier1.rarityScore);
          console.log("Setting rarity score:", tier1.rarityScore);
        } else {
          console.log("No rarity score in tier1 response");
        }
        
        // If tier2 is not expected (status is done), mark as complete
        if (!idLoading) {
          console.log("Tier1 only identification is complete.");
          setIdentificationComplete(true);
        }
        // Otherwise, wait for tier2 to finish - will be handled below
      } else {
        console.log("Tier1 identification failed - no label.");
        setVlmCaptureSuccess(false);
        setIdentificationComplete(true);
      }
    }

    // When tier2 results come in (or error)
    if (tier1 && !idLoading) { 
      // idLoading will be false when tier2 is done or errored
      console.log("==== IDENTIFICATION COMPLETE ====");
      console.log("tier1:", tier1);
      console.log("tier2:", tier2);

      setIdentificationComplete(true);
      
      // If we have tier2 results and they have a label, use those labels
      if (tier2 && tier2.label) {
        // Make sure we have a successful result
        setVlmCaptureSuccess(true);
        setIdentifiedLabel(tier2.label);
      }
    }
  }, [tier1, tier2, idLoading]);

  const handleCapture = useCallback(async (
    points: { x: number; y: number }[],
    cameraRef: React.RefObject<CameraView>
  ) => {
    if (posthog) {
      posthog.capture("capture_initiated", { method: "lasso" });
    }
    if (!cameraRef.current || points.length < 3) return;

    // Check connection status before proceeding with capture
    if (onRetryConnection) {
      await onRetryConnection();
    }

    // Prevent capture if offline or checking
    if (isCheckingServer) {
      Alert.alert(
        "Connecting...", 
        "Please wait while we check the server connection.",
        [{ text: "OK", style: "default" }]
      );
      cameraCaptureRef.current?.resetLasso();
      return;
    }
    if (!isServerConnected) {
      Alert.alert(
        "Offline", 
        "Cannot start capture. Please check your internet connection and try again.",
        [
          { text: "OK", style: "default" },
          { text: "Retry Connection", style: "cancel", onPress: onRetryConnection }
        ]
      );
      cameraCaptureRef.current?.resetLasso();
      return;
    }

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
        quality: 1, // Take high quality initially
        base64: false, // No need for base64 at this stage
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

      if (cropWidth < 5 || cropHeight < 5) {
        throw new Error("Selection area too small");
      }

      // Crop the image
      const cropResult = await ImageManipulator.manipulateAsync(
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
        // No need for base64 or high compression here yet, just get the cropped URI
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Store the captured URI for the animation (use the cropped one)
      setCapturedUri(cropResult.uri);

      // Resize and compress the CROPPED image for VLM
      const vlmImage = await processImageForVLM(cropResult.uri, cropResult.width, cropResult.height);

      if (!vlmImage || !vlmImage.base64) {
        console.warn("Failed to process cropped image for VLM or missing base64 data.");
        setVlmCaptureSuccess(false);
        setIsCapturing(false); // Allow new capture
        setCapturedUri(null); // Clear preview
        cameraCaptureRef.current?.resetLasso();
        return;
      }

      // VLM Identification
      try {
        const gpsData = location ? {
          lat: location.latitude,
          lng: location.longitude
        } : null;
        console.log("Sending location with capture:", gpsData);
        lastIdentifyPayloadRef.current = {
          base64Data: vlmImage.base64,
          contentType: "image/jpeg",
          gps: gpsData,
        };
        await identify({
          base64Data: vlmImage.base64,
          contentType: "image/jpeg",
          gps: gpsData
        });
      } catch (idError) {
        console.error("VLM Identification API Error:", idError);
        setVlmCaptureSuccess(false);
      }
    } catch (error) {
      console.error("Error capturing selected area:", error);
      setIsCapturing(false);
      setCapturedUri(null);
      cameraCaptureRef.current?.resetLasso();
      setVlmCaptureSuccess(null);
      setIdentifiedLabel(null);
    }
  }, [identify, tier1, tier2, user, location, isCheckingServer, isServerConnected, onRetryConnection, reset]);

  // Handle full screen capture
  const handleFullScreenCapture = useCallback(async () => {
    if (posthog) {
      posthog.capture("capture_initiated", { method: "full_screen" });
    }
    if (!cameraCaptureRef.current) return;
    
    // Check connection status before proceeding with capture
    if (onRetryConnection) {
      await onRetryConnection();
    }

    // Prevent capture if offline or checking
    if (isCheckingServer) {
      Alert.alert(
        "Connecting...", 
        "Please wait while we check the server connection.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }
    if (!isServerConnected) {
      Alert.alert(
        "Offline", 
        "Cannot start capture. Please check your internet connection and try again.",
        [
          { text: "OK", style: "default" },
          { text: "Retry Connection", style: "cancel", onPress: onRetryConnection }
        ]
      );
      return;
    }

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
        quality: 1, // Take high quality initially
        base64: false, // No need for base64 at this stage
        skipProcessing: false
      });

      if (!photo) {
        throw new Error("Failed to capture photo");
      }

      // Store the captured URI for the animation (use the original full res for polaroid preview)
      setCapturedUri(photo.uri);

      // Set full screen capture box dimensions for polaroid animation
      setCaptureBox({
        x: SCREEN_WIDTH * 0.1,
        y: SCREEN_HEIGHT * 0.2,
        width: SCREEN_WIDTH * 0.8,
        height: SCREEN_WIDTH * 0.8,
        aspectRatio: 1
      });

      // Resize and compress the FULL image for VLM
      const vlmImage = await processImageForVLM(photo.uri, photo.width, photo.height);

      if (!vlmImage || !vlmImage.base64) {
        console.warn("Failed to process full screen image for VLM or missing base64 data.");
        setVlmCaptureSuccess(false);
        setIsCapturing(false); // Allow new capture
        setCapturedUri(null); // Clear preview
        return;
      }

      // VLM Identification with the processed full photo
      try {
        const gpsData = location ? {
          lat: location.latitude,
          lng: location.longitude
        } : null;
        console.log("Sending location with full screen capture:", gpsData);
        lastIdentifyPayloadRef.current = {
          base64Data: vlmImage.base64,
          contentType: "image/jpeg",
          gps: gpsData,
        };
        await identify({
          base64Data: vlmImage.base64,
          contentType: "image/jpeg",
          gps: gpsData
        });
      } catch (vlmApiError) {
        console.error("VLM Identification API Error:", vlmApiError);
        setVlmCaptureSuccess(false);
      }
    } catch (error) {
      console.error("Error capturing full screen:", error);
      setIsCapturing(false);
      setCapturedUri(null);
      setVlmCaptureSuccess(null);
      setIdentifiedLabel(null);
    }
  }, [identify, tier1, tier2, user, SCREEN_HEIGHT, SCREEN_WIDTH, location, isCheckingServer, isServerConnected, onRetryConnection, reset]);

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

        const { item, isGlobalFirst } = await incrementOrCreateItem(label);
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
            daily_upvotes: 0,
            rarity_tier: rarityTier,
            rarity_score: rarityScore
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

          // Calculate and award XP
          let xpData = null;
          if (captureRecord && item && rarityTier) {
            const xpResult = await calculateAndAwardCaptureXP(
              session.user.id,
              captureRecord.id,
              item.name,
              rarityTier,
              (tier1 as any)?.xpValue, // Use XP value from backend if available
              isGlobalFirst // Pass global first flag
            );
            if (xpResult.total > 0) {
              xpData = xpResult;
            }
          }

          // Calculate and award coins
          const { total: coinsAwarded, rewards } = await calculateAndAwardCoins(session.user.id);
          
          // Check for level up first
          if (xpData?.levelUp && xpData?.newLevel) {
            setLevelUpData({ newLevel: xpData.newLevel });
            setLevelUpModalVisible(true);
          }
          
          // Show combined rewards modal if either coins or XP were awarded
          if (coinsAwarded > 0 || xpData) {
            setCoinModalData({ 
              total: coinsAwarded, 
              rewards,
              xpTotal: xpData?.total || 0,
              xpRewards: xpData?.rewards || [],
              levelUp: xpData?.levelUp,
              newLevel: xpData?.newLevel
            });
            // Only show coin/XP modal if there's no level up, or delay it
            if (!xpData?.levelUp) {
              setCoinModalVisible(true);
            } else {
              // Show coin modal after level up modal closes
              setTimeout(() => setCoinModalVisible(true), 500);
            }
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
    rarityTier, // Add rarity tier to dependencies
    rarityScore, // Add rarity score to dependencies
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

  useEffect(() => {
    // Track screen view when the camera route is active
    if (posthog && pathname === "/(screens)/camera") {
      posthog.screen("Camera");
    }
  }, [posthog, pathname]);

  if (!permissionsResolved) {
    // Camera or media permissions are still loading - DON'T render anything camera-related
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
        {/* Server Status Indicator - Styled as a rounded rectangle */}
        {isCheckingServer && (
          <View 
            className="absolute self-center bg-yellow-500 px-4 py-2 rounded-lg shadow-md z-50"
            style={{ top: insets.top + 8 }} // Position below status bar with a small margin
          >
            <Text className="text-white font-lexend-bold text-sm">Checking connection...</Text>
          </View>
        )}
        {!isCheckingServer && !isServerConnected && (
          <TouchableOpacity 
            className="absolute self-center bg-red-600 px-4 py-2 rounded-lg shadow-md z-50"
            style={{ top: insets.top + 8 }} // Position below status bar with a small margin
            onPress={onRetryConnection}
          >
            <Text className="text-white font-lexend-bold text-sm">Offline - Tap to retry</Text>
          </TouchableOpacity>
        )}

        {/* Camera capture component */}
        <CameraCapture
          ref={cameraCaptureRef}
          onCapture={handleCapture}
          isCapturing={isCapturing}
          onFullScreenCapture={handleFullScreenCapture}
          lassoEnabled={user?.lasso_capture_enabled ?? true}
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
            rarityTier={rarityTier}
            error={polaroidError}
            onRetry={handleRetryIdentification}
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
          xpTotal={coinModalData.xpTotal}
          xpRewards={coinModalData.xpRewards}
          levelUp={coinModalData.levelUp}
          newLevel={coinModalData.newLevel}
        />
        
        <LevelUpModal
          visible={levelUpModalVisible}
          onClose={() => setLevelUpModalVisible(false)}
          newLevel={levelUpData.newLevel}
        />

      </View>
    </GestureHandlerRootView>
  );
}