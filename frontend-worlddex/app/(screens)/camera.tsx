import React, { useRef, useState, useCallback, useEffect } from "react";
import { View, Dimensions } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { GestureHandlerRootView } from "react-native-gesture-handler";
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
import { fetchCollectionItems } from "../../database/hooks/useCollectionItems";
import {
  createUserCollectionItem,
  checkUserHasCollectionItem
} from "../../database/hooks/useUserCollectionItems";
import { fetchUserCollectionsByUser } from "../../database/hooks/useUserCollections";
import { IdentifyRequest } from "../../../shared/types/identify";
import { OfflineCaptureService } from "../../src/services/offlineCaptureService";
import { useImageProcessor } from "../../src/hooks/useImageProcessor";
import { useModalQueue } from "../../src/contexts/ModalQueueContext";
import { calculateAndAwardCoins } from "../../database/hooks/useCoins";
import { calculateAndAwardCaptureXP } from "../../database/hooks/useXP";

// Import new custom hooks
import { useCaptureLimits } from "../../src/hooks/useCaptureLimits";
import { useTutorialFlow } from "../../src/hooks/useTutorialFlow";
import { useOfflineCapture } from "../../src/hooks/useOfflineCapture";
import { useCaptureProcessing } from "../../src/hooks/useCaptureProcessing";
import { useModalSequence } from "../../src/hooks/useModalSequence";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface CameraScreenProps {}

export default function CameraScreen({}: CameraScreenProps) {
  const posthog = usePostHog();
  const pathname = usePathname();
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission] = Location.useForegroundPermissions();
  const cameraCaptureRef = useRef<CameraCaptureHandle>(null);
  const lastIdentifyPayloadRef = useRef<IdentifyRequest | null>(null);
  const { session } = useAuth();
  const userId = session?.user?.id || null;

  // Photo capture state
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [captureBox, setCaptureBox] = useState({
    x: 0, y: 0, width: 0, height: 0, aspectRatio: 1
  });

  // Location state
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // VLM
  const {
    identify,
    tier1, tier2,
    isLoading: idLoading,
    error: idError,
    reset
  } = useIdentify();
  const { uploadCapturePhoto } = usePhotoUpload();
  const { user, updateUser } = useUser(userId);
  const { incrementOrCreateItem } = useItems();
  const [vlmCaptureSuccess, setVlmCaptureSuccess] = useState<boolean | null>(null);
  const [identifiedLabel, setIdentifiedLabel] = useState<string | null>(null);
  const isRejectedRef = useRef(false);
  // Add state to track whether identification is fully complete (both tiers if applicable)
  const [identificationComplete, setIdentificationComplete] = useState(false);
  
  // Derive permission resolution status - no useState needed
  const permissionsResolved = permission?.status != null;

  // Add a state for tracking public/private status
  const [isCapturePublic, setIsCapturePublic] = useState(false);
  
  // Add state for rarity tier
  const [rarityTier, setRarityTier] = useState<"common" | "uncommon" | "rare" | "epic" | "mythic" | "legendary">("common");
  
  // Add state for rarity score
  const [rarityScore, setRarityScore] = useState<number | undefined>(undefined);
  
  
  // Use styled alerts
  const { showAlert } = useAlert();
  
  // Use our new custom hooks
  const { checkCaptureLimit } = useCaptureLimits(userId);
  const { showTutorialOverlay, setShowTutorialOverlay, panResponder, handleFirstCapture } = useTutorialFlow(userId);
  const { savedOffline, setSavedOffline, saveOfflineCapture, initializeOfflineService } = useOfflineCapture();
  const { processLassoCapture, processFullScreenCapture } = useCaptureProcessing();
  const { queuePostCaptureModals } = useModalSequence();
  const { enqueueModal, isShowingModal, currentModal } = useModalQueue();
  
  // Don't show error in polaroid if we're saving offline
  // Don't pass network errors to polaroid - we handle them differently
  const polaroidError = (vlmCaptureSuccess === true || savedOffline || (idError && idError.message === 'Network request failed')) ? null : idError;
  
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
    if (userId) {
      initializeOfflineService(userId);
    }
  }, [userId, initializeOfflineService]);

  // Debug modal queue state
  useEffect(() => {
    console.log("=== MODAL QUEUE STATE ===");
    console.log("isShowingModal:", isShowingModal);
    console.log("currentModal:", currentModal);
    console.log("isCapturing:", isCapturing);
    console.log("Camera screen pathname:", pathname);
    
    // Log warning if modal is showing but camera is on wrong path
    if (isShowingModal && pathname !== '/') {
      console.warn("WARNING: Modal showing but camera not on root path!");
    }
  }, [isShowingModal, currentModal, isCapturing, pathname]);
  
  // Handle network errors from useIdentify
  useEffect(() => {
    if (idError && idError.message === 'Network request failed' && isCapturing && capturedUri && !savedOffline && userId) {
      console.log("[OFFLINE FLOW] Detected network error from useIdentify");
      
      // Set states to trigger offline save flow
      setSavedOffline(true);
      setVlmCaptureSuccess(null);
      setIdentificationComplete(false);
      
      // Save the capture locally
      saveOfflineCapture({
        capturedUri,
        location: location || undefined,
        captureBox,
        userId,
        method: 'auto_dismiss',
        reason: 'network_error'
      }).then(() => {
        console.log("[OFFLINE FLOW] Successfully saved offline capture from network error handler");
        cameraCaptureRef.current?.resetLasso();
      }).catch(error => {
        console.error("Failed to save offline capture from network error handler:", error);
      });
    }
  }, [idError, isCapturing, capturedUri, savedOffline, location, captureBox, userId, setSavedOffline, saveOfflineCapture]);

  // Don't automatically request location permission anymore
  // It will be requested contextually after a successful capture

  // Get location when permission is granted
  useEffect(() => {
    const getLocation = async () => {
      if (!locationPermission?.granted) return;

      try {
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
        setLocation(null);
      }
    };

    getLocation();
  }, [locationPermission?.granted]);

  // All tutorial logic is now handled by useTutorialFlow hook

  // Removed automatic error handling - errors are now handled in the catch blocks
  // This prevents the polaroid from showing "Identification Failed" when we're saving offline


  // Location prompt responses are now handled by the modal system



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
    // Handle first capture tutorial flow
    await handleFirstCapture();
    
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

    // Check capture limits
    if (!checkCaptureLimit()) {
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

      // Process the capture using our new hook
      const processed = await processLassoCapture({
        photoUri: photo.uri,
        photoWidth: photo.width,
        photoHeight: photo.height,
        points
      });

      // Store the captured URI and box for the animation
      setCapturedUri(processed.croppedUri);
      setCaptureBox(processed.captureBox);

      if (!processed.vlmImage || !processed.vlmImage.base64) {
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
          base64Data: processed.vlmImage.base64,
          contentType: "image/jpeg",
          gps: gpsData,
        };
        await identify({
          base64Data: processed.vlmImage.base64,
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
        if (!userId) {
          console.error("[OFFLINE FLOW] No user session for offline save");
          return;
        }
        
        await saveOfflineCapture({
          capturedUri: processed.croppedUri,
          location: location || undefined,
          captureBox: processed.captureBox,
          userId,
          method: 'lasso',
          reason: 'identification_failed'
        }).then(() => {
          console.log("[OFFLINE FLOW] Successfully saved offline capture");
          cameraCaptureRef.current?.resetLasso();
        }).catch(saveError => {
          console.error("Failed to save offline capture:", saveError);
          cameraCaptureRef.current?.resetLasso();
          setIsCapturing(false);
          setCapturedUri(null);
        });
      }
    } catch (error) {
      console.error("Error capturing selected area:", error);
      setIsCapturing(false);
      setCapturedUri(null);
      cameraCaptureRef.current?.resetLasso();
      setVlmCaptureSuccess(null);
      setIdentifiedLabel(null);
    }
  }, [identify, tier1, tier2, userId, location, reset, permission, requestPermission, handleFirstCapture, checkCaptureLimit, processLassoCapture, saveOfflineCapture, setSavedOffline, showAlert, showTutorialOverlay, posthog]);

  // Handle full screen capture
  const handleFullScreenCapture = useCallback(async () => {
    // Handle first capture tutorial flow
    await handleFirstCapture();
    
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
    
    // Check capture limits
    if (!checkCaptureLimit()) {
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

      // Process the capture using our new hook
      const processed = await processFullScreenCapture({
        photoUri: photo.uri,
        photoWidth: photo.width,
        photoHeight: photo.height
      });

      // Store the capture box for animation
      setCaptureBox(processed.captureBox);

      if (!processed.vlmImage || !processed.vlmImage.base64) {
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
          base64Data: processed.vlmImage.base64,
          contentType: "image/jpeg",
          gps: gpsData,
        };
        await identify({
          base64Data: processed.vlmImage.base64,
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
        if (!userId) {
          console.error("[OFFLINE FLOW] No user session for offline save");
          return;
        }
        
        await saveOfflineCapture({
          capturedUri: photo.uri,
          location: location || undefined,
          captureBox: processed.captureBox,
          userId,
          method: 'full_screen',
          reason: 'identification_failed'
        }).catch(saveError => {
          console.error("Failed to save offline capture:", saveError);
          setIsCapturing(false);
          setCapturedUri(null);
          setVlmCaptureSuccess(false);
        });
      }
    } catch (error) {
      console.error("Error capturing full screen:", error);
      setIsCapturing(false);
      setCapturedUri(null);
      setVlmCaptureSuccess(null);
      setIdentifiedLabel(null);
    }
  }, [identify, tier1, tier2, userId, SCREEN_HEIGHT, SCREEN_WIDTH, location, reset, permission, requestPermission, handleFirstCapture, checkCaptureLimit, processFullScreenCapture, saveOfflineCapture, setSavedOffline, showAlert, showTutorialOverlay, posthog]);

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
        const localImageUri = await OfflineCaptureService.saveImageLocally(capturedUri, userId);
        
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
        }, userId);

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
      userId &&
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
        }, userId);
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
            user_id: userId,
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
          if (tempCaptureId && userId) {
            try {
              await OfflineCaptureService.deletePendingCapture(tempCaptureId, userId);
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
              const userCollections = await fetchUserCollectionsByUser(userId);
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
                    const hasItem = await checkUserHasCollectionItem(userId, collectionItem.id);

                    if (!hasItem) {
                      await createUserCollectionItem({
                        user_id: userId,
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
          await incrementUserField(userId, "daily_captures_used", 1);
          await incrementUserField(userId, "total_captures", 1);
          
          // Hide tutorial overlay and mark as onboarded on first capture
          if (showTutorialOverlay) {
            setShowTutorialOverlay(false);
            await updateUser({ is_onboarded: true });
          }

          // Calculate and award XP
          let xpData = null;
          if (captureRecord && item && rarityTier) {
            const xpResult = await calculateAndAwardCaptureXP(
              userId,
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
          const { total: coinsAwarded, rewards } = await calculateAndAwardCoins(userId);
          
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
    // Dependencies for user field updates
    incrementUserField,
    // Dependencies for coin logic
    calculateAndAwardCoins,
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