import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { View, Button, Text, Dimensions, ActivityIndicator, TouchableOpacity, Linking, PanResponder } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import * as Location from "expo-location";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";
import { usePathname } from "expo-router";
import { useAlert } from "../../src/contexts/AlertContext";

import CameraCapture, { CameraCaptureHandle } from "../components/camera/CameraCapture";
import PolaroidDevelopment from "../components/camera/PolaroidDevelopment";
import CameraTutorialOverlay from "../components/camera/CameraTutorialOverlay";
import { CameraPlaceholder } from "../components/camera/CameraPlaceholder";
import { useIdentify } from "../../src/hooks/useIdentify";
import { usePhotoUpload } from "../../src/hooks/usePhotoUpload";
import { useAuth } from "../../src/contexts/AuthContext";
import { useItems } from "../../database/hooks/useItems";
import { incrementUserField, updateUserField } from "../../database/hooks/useUsers";
import { useUser } from "../../database/hooks/useUsers";
import type { Capture, CollectionItem } from "../../database/types";
import { calculateAndAwardCoins } from "../../database/hooks/useCoins";
import { calculateAndAwardCaptureXP } from "../../database/hooks/useXP";
import { fetchCollectionItems } from "../../database/hooks/useCollectionItems";
import {
  createUserCollectionItem,
  checkUserHasCollectionItem
} from "../../database/hooks/useUserCollectionItems";
import { fetchUserCollectionsByUser } from "../../database/hooks/useUserCollections";
import { useImageProcessor } from "../../src/hooks/useImageProcessor";
import { IdentifyRequest } from "../../../shared/types/identify";
import { OfflineCaptureService } from "../../src/services/offlineCaptureService";
import { supabase } from "../../database/supabase-client";
import { useModalQueue } from "../../src/contexts/ModalQueueContext";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const MAX_IMAGE_DIMENSION = 1024; // Max dimension for VLM input
const IMAGE_COMPRESSION_LEVEL = 0.8; // JPEG compression level

interface CameraScreenProps {
  capturesButtonClicked?: boolean;
}

export default function CameraScreen({ 
  capturesButtonClicked = false
}: CameraScreenProps) {
  const posthog = usePostHog();
  const pathname = usePathname();
  const { processImageForVLM } = useImageProcessor();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
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
  // Add state to track whether identification is fully complete (both tiers if applicable)
  const [identificationComplete, setIdentificationComplete] = useState(false);
  // Track if capture was saved offline
  const [savedOffline, setSavedOffline] = useState(false);
  // Add ref to prevent duplicate offline saves
  const offlineSaveInProgressRef = useRef(false);
  
  // Derive permission resolution status - no useState needed
  const permissionsResolved = permission?.status != null;

  // Tutorial overlay state
  const [showTutorialOverlay, setShowTutorialOverlay] = useState(false);
  const [idleTimerActive, setIdleTimerActive] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tutorialShownCountRef = useRef(0);

  // Add a state for tracking public/private status
  const [isCapturePublic, setIsCapturePublic] = useState(false);

  // Modal queue system
  const { enqueueModal } = useModalQueue();
  
  // Add state for rarity tier
  const [rarityTier, setRarityTier] = useState<"common" | "uncommon" | "rare" | "epic" | "mythic" | "legendary">("common");
  
  // Add state for rarity score
  const [rarityScore, setRarityScore] = useState<number | undefined>(undefined);
  
  
  // Don't show error in polaroid if we're saving offline
  // Don't pass network errors to polaroid - we handle them differently
  const polaroidError = (vlmCaptureSuccess === true || savedOffline || (idError && idError.message === 'Network request failed')) ? null : idError;
  
  // Use styled alerts
  const { showAlert } = useAlert();
  
  const handleRetryIdentification = useCallback(async () => {
    if (!lastIdentifyPayloadRef.current) return;

    await new Promise(res => {
      reset();
      requestAnimationFrame(res);   // wait exactly one frame
    });
  
    /** Clear local UI state */
    reset();
    setVlmCaptureSuccess(null);
    setIdentifiedLabel(null);
    setIdentificationComplete(false);
    isRejectedRef.current = false;
  
    /** Fire the request again */
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
    lastIdentifyPayloadRef
  ]);

  // Initialize offline capture service
  useEffect(() => {
    if (session?.user?.id) {
      OfflineCaptureService.initialize(session.user.id).catch(console.error);
    }
  }, [session?.user?.id]);
  
  // Handle network errors from useIdentify
  useEffect(() => {
    if (idError && idError.message === 'Network request failed' && isCapturing && capturedUri && !savedOffline && !offlineSaveInProgressRef.current) {
      console.log("[OFFLINE FLOW] Detected network error from useIdentify");
      
      // Prevent duplicate saves
      offlineSaveInProgressRef.current = true;
      
      // Set states to trigger offline save flow
      setSavedOffline(true);
      setVlmCaptureSuccess(null);
      setIdentificationComplete(false);
      
      // Save the capture locally
      (async () => {
        if (!session?.user?.id) {
          console.error("[OFFLINE FLOW] No user session for offline save");
          offlineSaveInProgressRef.current = false;
          return;
        }
        
        try {
          const localImageUri = await OfflineCaptureService.saveImageLocally(capturedUri, session.user.id);
          
          await OfflineCaptureService.savePendingCapture({
            imageUri: localImageUri,
            capturedAt: new Date().toISOString(),
            location: location ? { 
              latitude: location.latitude, 
              longitude: location.longitude 
            } : undefined,
            captureBox: captureBox
          }, session.user.id);
          
          console.log("[OFFLINE FLOW] Successfully saved offline capture from network error handler");
          
          // Reset lasso if available
          cameraCaptureRef.current?.resetLasso();
          
          // Track offline capture
          if (posthog) {
            posthog.capture("offline_capture_saved", {
              method: "capture",
              reason: "network_error"
            });
          }
        } catch (saveError) {
          console.error("Failed to save offline capture:", saveError);
          showAlert({
            title: "Error",
            message: "Failed to save capture. Please try again.",
            icon: "alert-circle-outline",
            iconColor: "#EF4444"
          });
        } finally {
          offlineSaveInProgressRef.current = false;
        }
      })();
    }
  }, [idError, isCapturing, capturedUri, savedOffline, location, captureBox, posthog, showAlert]);

  // Don't automatically request location permission anymore
  // It will be requested contextually after a successful capture

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

  // Show tutorial overlay for new users
  useEffect(() => {
    if (user && !user.is_onboarded) {
      setShowTutorialOverlay(true);
      setIdleTimerActive(false); // Don't use idle timer for first-time users
    } else if (user && user.is_onboarded) {
      // For returning users, activate idle detection
      setIdleTimerActive(true);
    }
  }, [user]);

  // Idle detection for tutorial nudge
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    
    // Only set new timer if:
    // 1. Idle timer is active (user is onboarded)
    // 2. Tutorial isn't currently showing
    // 3. Haven't shown it too many times
    if (idleTimerActive && !showTutorialOverlay && tutorialShownCountRef.current < 3) {
      idleTimerRef.current = setTimeout(() => {
        setShowTutorialOverlay(true);
        tutorialShownCountRef.current += 1;
      }, 8000); // 8 seconds of inactivity
    }
  }, [idleTimerActive, showTutorialOverlay]);
  
  // Disable idle timer after first capture
  const disableIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    setIdleTimerActive(false);
  }, []);

  // PanResponder for idle detection - recreated when dependencies change
  const panResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponderCapture: () => {
        // This fires on any touch interaction
        if (showTutorialOverlay && user?.is_onboarded) {
          // Hide tutorial on any interaction if user is already onboarded
          setShowTutorialOverlay(false);
        }
        resetIdleTimer();
        return false; // Important: Don't capture the touch, let it pass through
      },
    }),
    [showTutorialOverlay, user, resetIdleTimer]
  );

  // Set up initial timer when component mounts or dependencies change
  useEffect(() => {
    resetIdleTimer();

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [resetIdleTimer]);

  // Check for progressive onboarding modals (circle and swipe)
  useEffect(() => {
    if (!user) return;

    // Show circle tutorial modal after 3 captures
    if (user.total_captures && user.total_captures >= 3 && !user.onboarding_circle_shown) {
      enqueueModal({
        type: 'onboardingCircle',
        data: {},
        priority: 80,
        persistent: false
      });
      updateUser({ onboarding_circle_shown: true }).catch(console.error);
    }

    // Show swipe tutorial modal after 10 captures
    if (user.total_captures && user.total_captures >= 10 && !user.onboarding_swipe_shown) {
      enqueueModal({
        type: 'onboardingSwipe',
        data: {},
        priority: 80,
        persistent: false
      });
      updateUser({ onboarding_swipe_shown: true }).catch(console.error);
    }
  }, [user, enqueueModal, updateUser]);

  // Removed automatic error handling - errors are now handled in the catch blocks
  // This prevents the polaroid from showing "Identification Failed" when we're saving offline


  // Handle location prompt responses
  const handleEnableLocation = useCallback(async () => {
    console.log("=== USER ENABLING LOCATION ===");
    
    const { status } = await requestLocationPermission();
    console.log("Location permission result:", status);
    
    if (status === 'granted') {
      // Get location for future captures
      try {
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        
        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude
        });
        
        console.log("Location obtained:", currentLocation.coords);
        
        showAlert({
          title: "Location Enabled!",
          message: "Your future captures will remember where you found them",
          icon: "location",
          iconColor: "#10B981"
        });
      } catch (error) {
        console.error("Error getting location after permission:", error);
      }
    }
  }, [requestLocationPermission, showAlert]);

  const handleSkipLocation = useCallback(() => {
    console.log("=== USER SKIPPED LOCATION ===");
    // The modal coordinator handles dismissal automatically
  }, []);



  // Safety check: if camera is stuck in capturing state without a captured image
  useEffect(() => {
    if (isCapturing && !capturedUri) {
      const timeoutId = setTimeout(() => {
        if (isCapturing && !capturedUri) {
          console.warn("=== CAMERA STUCK IN CAPTURING STATE - FORCING RESET ===");
          setIsCapturing(false);
          cameraCaptureRef.current?.resetLasso();
        }
      }, 5000); // Give 5 seconds for normal flow
      
      return () => clearTimeout(timeoutId);
    }
  }, [isCapturing, capturedUri]);

  // Update useEffect that watches for tier1 and tier2 changes
  useEffect(() => {
    
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
        // Don't set failure state - this will be handled by offline save logic
        // setVlmCaptureSuccess(false);
        // setIdentificationComplete(true);
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
    // Disable idle timer permanently once they've initiated a capture
    disableIdleTimer();
    
    // Hide tutorial for new users when they make their first capture attempt
    if (showTutorialOverlay && !user?.is_onboarded) {
      setShowTutorialOverlay(false);
    }
    
    // Check camera permission first
    if (!permission?.granted) {
      // This shouldn't happen with placeholder, but just in case
      await requestPermission();
      return;
    }
    
    if (posthog) {
      posthog.capture("capture_initiated", { method: "lasso" });
    }
    if (!cameraRef.current || points.length < 3) return;

    // Check if user has reached their daily capture limit (only count accepted captures)
    if (user && user.daily_captures_used >= 10) {
      showAlert({
        title: "Daily Limit Reached",
        message: "You have used all 10 daily captures! They will reset at midnight PST.",
        icon: "timer-outline",
        iconColor: "#EF4444"
      });
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
      console.log("=== SETTING isCapturing = true (lasso capture) ===");
      setIsCapturing(true);
      // Set initial identifying state so polaroid shows "Identifying..." instead of "..."
      setVlmCaptureSuccess(null);
      setIdentifiedLabel(null);

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

      // Always try to identify first
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
        console.log("[OFFLINE FLOW] Starting offline save flow");
        
        // Set states to trigger auto-dismiss in PolaroidDevelopment
        // captureSuccess=null and isIdentifying=false triggers auto-dismiss after 1.5s
        console.log("[OFFLINE FLOW] Setting states: savedOffline=true, vlmCaptureSuccess=null");
        setSavedOffline(true);
        setVlmCaptureSuccess(null); // Keep null to trigger auto-dismiss
        // Don't set label - PolaroidDevelopment will show "Saving..." automatically
        setIdentificationComplete(false); // Not complete yet
        
        console.log("[OFFLINE FLOW] States set, expecting PolaroidDevelopment to auto-dismiss")
        
        // Now save locally for later
        try {
          if (!session?.user?.id) {
            console.error("[OFFLINE FLOW] No user session for offline save");
            return;
          }
          const localImageUri = await OfflineCaptureService.saveImageLocally(cropResult.uri, session.user.id);
          await OfflineCaptureService.savePendingCapture({
            imageUri: localImageUri,
            capturedAt: new Date().toISOString(),
            location: location ? { 
              latitude: location.latitude, 
              longitude: location.longitude 
            } : undefined,
            captureBox: {
              x: minX / scaleX,
              y: minY / scaleY,
              width: cropWidth / scaleX,
              height: cropHeight / scaleY,
              aspectRatio
            }
          }, session.user.id);

          // Reset lasso
          cameraCaptureRef.current?.resetLasso();

          // No need for manual dismiss - PolaroidDevelopment handles it

          console.log("[OFFLINE FLOW] Successfully saved offline capture");
          
          // Track offline capture
          if (posthog) {
            posthog.capture("offline_capture_saved", {
              method: "lasso",
              reason: "identification_failed"
            });
          }
        } catch (saveError) {
          console.error("Failed to save offline capture:", saveError);
          showAlert({
            title: "Error",
            message: "Failed to save capture. Please try again.",
            icon: "alert-circle-outline",
            iconColor: "#EF4444"
          });
          cameraCaptureRef.current?.resetLasso();
          setIsCapturing(false);
          setCapturedUri(null);
          return;
        }
      }
    } catch (error) {
      console.error("Error capturing selected area:", error);
      setIsCapturing(false);
      setCapturedUri(null);
      cameraCaptureRef.current?.resetLasso();
      setVlmCaptureSuccess(null);
      setIdentifiedLabel(null);
    }
  }, [identify, tier1, tier2, user, location, reset, permission, requestPermission, disableIdleTimer, showAlert, showTutorialOverlay, posthog]);

  // Handle full screen capture
  const handleFullScreenCapture = useCallback(async () => {
    // Disable idle timer permanently once they've initiated a capture
    disableIdleTimer();
    
    // Hide tutorial for new users when they make their first capture attempt
    if (showTutorialOverlay && !user?.is_onboarded) {
      setShowTutorialOverlay(false);
    }
    
    // Check camera permission first
    if (!permission?.granted) {
      // This shouldn't happen with placeholder, but just in case
      await requestPermission();
      return;
    }
    
    if (posthog) {
      posthog.capture("capture_initiated", { method: "full_screen" });
    }
    if (!cameraCaptureRef.current) return;
    
    // Check if user has reached their daily capture limit (only count accepted captures)
    if (user && user.daily_captures_used >= 10) {
      showAlert({
        title: "Daily Limit Reached",
        message: "You have used all 10 daily captures! They will reset at midnight PST.",
        icon: "timer-outline",
        iconColor: "#EF4444"
      });
      return;
    }

    // Reset VLM state for new capture
    setVlmCaptureSuccess(null);
    setIdentifiedLabel(null);
    setIdentificationComplete(false);

    // Start capture state - freeze UI
    console.log("=== SETTING isCapturing = true (full screen capture) ===");
    setIsCapturing(true);
    // Set initial identifying state so polaroid shows "Identifying..." instead of "..."
    setVlmCaptureSuccess(null);
    setIdentifiedLabel(null);

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
      const captureBoxDimensions = {
        x: SCREEN_WIDTH * 0.1,
        y: SCREEN_HEIGHT * 0.2,
        width: SCREEN_WIDTH * 0.8,
        height: SCREEN_WIDTH * 0.8,
        aspectRatio: 1
      };
      setCaptureBox(captureBoxDimensions);

      // Always try to identify first
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
        
        // Immediately set states to show saving state in polaroid (before any async operations)
        setSavedOffline(true);
        setVlmCaptureSuccess(true); // This will prevent error state
        setIdentifiedLabel(""); // Keep label empty for offline saves
        setIdentificationComplete(true);
        
        // Removed force re-render - not needed
        
        // Now save locally for later
        try {
          if (!session?.user?.id) {
            console.error("[OFFLINE FLOW] No user session for offline save");
            return;
          }
          const localImageUri = await OfflineCaptureService.saveImageLocally(photo.uri, session.user.id);
          await OfflineCaptureService.savePendingCapture({
            imageUri: localImageUri,
            capturedAt: new Date().toISOString(),
            location: location ? { 
              latitude: location.latitude, 
              longitude: location.longitude 
            } : undefined,
            captureBox: captureBoxDimensions
          }, session.user.id);

          // No need for manual dismiss - PolaroidDevelopment handles it

          // Track offline capture
          if (posthog) {
            posthog.capture("offline_capture_saved", {
              method: "full_screen",
              reason: "identification_failed"
            });
          }
        } catch (saveError) {
          console.error("Failed to save offline capture:", saveError);
          showAlert({
            title: "Error",
            message: "Failed to save capture. Please try again.",
            icon: "alert-circle-outline",
            iconColor: "#EF4444"
          });
          setIsCapturing(false);
          setCapturedUri(null);
          setVlmCaptureSuccess(false);
          return;
        }
      }
    } catch (error) {
      console.error("Error capturing full screen:", error);
      setIsCapturing(false);
      setCapturedUri(null);
      setVlmCaptureSuccess(null);
      setIdentifiedLabel(null);
    }
  }, [identify, tier1, tier2, user, SCREEN_HEIGHT, SCREEN_WIDTH, location, reset, permission, requestPermission, disableIdleTimer, showAlert, showTutorialOverlay, posthog]);

  // Handle dismiss of the preview
  const handleDismissPreview = useCallback(async () => {
    console.log("==== handleDismissPreview called ====");
    console.log("Current state: identificationComplete:", identificationComplete, "vlmCaptureSuccess:", vlmCaptureSuccess, "identifiedLabel:", identifiedLabel, "isRejectedRef.current:", isRejectedRef.current, "savedOffline:", savedOffline);

    // Detect offline state (polaroid auto-dismissed with no success)
    if (!identificationComplete && vlmCaptureSuccess === null && !identifiedLabel && capturedUri && !isRejectedRef.current) {
      console.log("Detected offline auto-dismiss - saving locally");
      
      try {
        if (!session?.user?.id) {
          console.error("Detected offline auto-dismiss but no user session");
          return;
        }
        const localImageUri = await OfflineCaptureService.saveImageLocally(capturedUri, session.user.id);
        
        // For lasso captures, we need captureBox from state
        // For full screen, use default dimensions
        const offlineCaptureBox = captureBox || {
          x: SCREEN_WIDTH * 0.1,
          y: SCREEN_HEIGHT * 0.2,
          width: SCREEN_WIDTH * 0.8,
          height: SCREEN_WIDTH * 0.8,
          aspectRatio: 1
        };
        
        await OfflineCaptureService.savePendingCapture({
          imageUri: localImageUri,
          capturedAt: new Date().toISOString(),
          location: location ? { 
            latitude: location.latitude, 
            longitude: location.longitude 
          } : undefined,
          captureBox: offlineCaptureBox
        }, session.user.id);

        // Show the modal after a brief delay
        setTimeout(() => {
          showAlert({
            title: "Saved for Later",
            message: "We'll identify your capture when you're back online.",
            icon: "save-outline",
            iconColor: "#10B981"
          });
        }, 300);

        // Track offline capture
        if (posthog) {
          posthog.capture("offline_capture_saved", {
            method: "auto_dismiss",
            reason: "network_unavailable"
          });
        }
      } catch (saveError) {
        console.error("Failed to save offline capture:", saveError);
        showAlert({
          title: "Error",
          message: "Failed to save capture. Please try again.",
          icon: "alert-circle-outline",
          iconColor: "#EF4444"
        });
      }
      
      // Reset states
      setIsCapturing(false);
      setCapturedUri(null);
      cameraCaptureRef.current?.resetLasso();
      setVlmCaptureSuccess(null);
      setIdentifiedLabel(null);
      setIdentificationComplete(false);
      isRejectedRef.current = false;
      reset();
      return;
    }

    // Handle offline save case (from catch block)
    if (savedOffline && !isRejectedRef.current) {
      console.log("[OFFLINE FLOW] handleDismissPreview - offline save case detected");
      
      // Animate polaroid dismissal first
      setIsCapturing(false);
      setCapturedUri(null);
      
      // Show the modal after a brief delay for smooth transition
      setTimeout(() => {
        console.log("[OFFLINE FLOW] Showing saved for later modal");
        showAlert({
          title: "Saved for Later",
          message: "We'll identify your capture when you're back online.",
          icon: "save-outline",
          iconColor: "#10B981"
        });
      }, 300); // Small delay for smooth transition
      
      // Reset states
      setSavedOffline(false);
      cameraCaptureRef.current?.resetLasso();
      setVlmCaptureSuccess(null);
      setIdentifiedLabel(null);
      setIdentificationComplete(false);
      isRejectedRef.current = false;
      reset();
      return;
    }

    // Only proceed if identification is complete, was successful, a label exists,
    // there's a captured URI, a session, and the user didn't explicitly reject it.
    if (
      identificationComplete &&
      vlmCaptureSuccess === true && // Explicitly check for true
      identifiedLabel &&
      capturedUri &&
      session &&
      !isRejectedRef.current &&
      !savedOffline
    ) {
      
      // Create temporary capture for immediate display
      let tempCaptureId: string | null = null;
      try {
        const tempCapture = await OfflineCaptureService.saveTemporaryCapture({
          imageUri: capturedUri,
          capturedAt: new Date().toISOString(),
          location: location || undefined,
          captureBox: captureBox,
          label: identifiedLabel,
          rarityTier: rarityTier,
          rarityScore: rarityScore
        }, session.user.id);
        tempCaptureId = tempCapture.id;
      } catch (tempError) {
        console.error("Failed to create temporary capture:", tempError);
        // Continue with normal flow even if temp capture fails
      }
      
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
          
          
          // Clean up temporary capture now that database save is complete
          if (tempCaptureId) {
            try {
              await OfflineCaptureService.deletePendingCapture(tempCaptureId, session.user.id);
            } catch (cleanupError) {
              console.error("Failed to clean up temporary capture:", cleanupError);
              // Non-critical error, continue
            }
          }

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

          // Increment daily_captures_used and total_captures for the user
          await incrementUserField(session.user.id, "daily_captures_used", 1);
          await incrementUserField(session.user.id, "total_captures", 1);
          
          // Hide tutorial overlay and mark as onboarded on first capture
          if (showTutorialOverlay) {
            setShowTutorialOverlay(false);
            await updateUser({ is_onboarded: true });
          }

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
          
          // Queue modals using the new system
          console.log("=== QUEUEING POST-CAPTURE MODALS ===");
          
          // 1. Level up modal (highest priority)
          if (xpData?.levelUp && xpData?.newLevel) {
            console.log("Queueing level up modal");
            enqueueModal({
              type: 'levelUp',
              data: { newLevel: xpData.newLevel },
              priority: 100,
              persistent: false
            });
          }
          
          // 2. Coin/XP reward modal (medium priority)
          if (coinsAwarded > 0 || xpData) {
            console.log("Queueing coin reward modal");
            enqueueModal({
              type: 'coinReward',
              data: {
                total: coinsAwarded,
                rewards,
                xpTotal: xpData?.total || 0,
                xpRewards: xpData?.rewards || [],
                levelUp: xpData?.levelUp,
                newLevel: xpData?.newLevel
              },
              priority: 50,
              persistent: false
            });
          }
          
          // 3. Location prompt (lowest priority, persistent)
          // Get fresh permission status to avoid stale state from earlier modal interactions
          const currentLocationPermission = await Location.getForegroundPermissionsAsync();
          if (!currentLocationPermission.granted && currentLocationPermission.status === 'undetermined') {
            console.log("Queueing location prompt (persistent)");
            enqueueModal({
              type: 'locationPrompt',
              data: { itemName: identifiedLabel },
              priority: 10,
              persistent: true // This survives navigation!
            });
          } else {
            console.log("Not queueing location prompt:", 
              !currentLocationPermission ? "No permission object" :
              currentLocationPermission.granted ? "Already granted" :
              currentLocationPermission.status !== 'undetermined' ? `Status is ${currentLocationPermission.status}` :
              "Unknown"
            );
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
    console.log("=== SETTING isCapturing = false (handleDismissPreview) ===");
    setIsCapturing(false);
    setCapturedUri(null);
    cameraCaptureRef.current?.resetLasso();
    setVlmCaptureSuccess(null);
    setIdentifiedLabel(null);
    setIdentificationComplete(false); // Reset for the next capture cycle
    setIsCapturePublic(true); // Reset to default public status
    isRejectedRef.current = false; // Reset rejection flag
    setSavedOffline(false); // Reset offline flag

    // Reset the useIdentify hook's internal state if a reset function is available
    if (reset) {
      console.log("Calling reset on useIdentify hook.");
      reset();
    }
    
    // Force a state update to ensure camera is interactive
    requestAnimationFrame(() => {
      console.log("Camera should now be interactive again");
    });
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
    incrementUserField,
    // Modal queue
    enqueueModal,
    // Offline handling
    savedOffline,
    showAlert,
    captureBox,
    location,
    SCREEN_WIDTH,
    SCREEN_HEIGHT,
    posthog
  ]);

  useEffect(() => {
    // Track screen view when the camera route is active
    if (posthog && pathname === "/(screens)/camera") {
      posthog.screen("Camera");
    }
  }, [posthog, pathname]);

  if (!permissionsResolved) {
    // Camera permissions are still loading - DON'T render anything camera-related
    return <View className="flex-1 bg-background" />;
  }

  // Don't request location automatically anymore
  // It will be requested after first successful capture

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View 
        className="flex-1"
        {...panResponder.panHandlers}
      >
        {/* Camera capture component or placeholder */}
        {permission?.granted ? (
          <CameraCapture
            ref={cameraCaptureRef}
            onCapture={handleCapture}
            isCapturing={isCapturing}
            onFullScreenCapture={handleFullScreenCapture}
          />
        ) : (
          <CameraPlaceholder
            onRequestPermission={requestPermission}
            permissionStatus={permission?.status || 'undetermined'}
          />
        )}

        {/* Tutorial overlay - shows on top of camera but under other UI */}
        {permission?.granted && showTutorialOverlay && (
          <CameraTutorialOverlay 
            visible={showTutorialOverlay}
            onComplete={() => {
              // Tutorial completed when user makes their first capture
            }}
          />
        )}

        {/* Polaroid development and animation overlay */}
        {isCapturing && capturedUri && (
          <PolaroidDevelopment
            photoUri={capturedUri}
            captureBox={captureBox}
            onDismiss={handleDismissPreview}
            captureSuccess={vlmCaptureSuccess}
            isIdentifying={savedOffline ? false : idLoading}
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
            isOfflineSave={savedOffline}
          />
        )}



      </View>
    </GestureHandlerRootView>
  );
}