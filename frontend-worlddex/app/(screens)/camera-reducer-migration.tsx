// This file contains the complete migrated version of camera.tsx with all state setters replaced with dispatch calls

import React, { useRef, useCallback, useEffect } from "react";
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
import { useCaptureLimitsWithPersistence } from "../../src/hooks/useCaptureLimitsWithPersistence";
import { useTutorialFlow } from "../../src/hooks/useTutorialFlow";
import { useOfflineCapture } from "../../src/hooks/useOfflineCapture";
import { useCaptureProcessing } from "../../src/hooks/useCaptureProcessing";
import { useModalSequence } from "../../src/hooks/useModalSequence";
import { useCameraReducer } from "../../src/hooks/useCameraReducer";

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

  // Use camera reducer for consolidated state management
  const {
    state: cameraState,
    dispatch,
    actions,
    // Convenience getters
    isCapturing,
    capturedUri,
    captureBox,
    location,
    vlmSuccess: vlmCaptureSuccess,
    identifiedLabel,
    identificationComplete,
    isCapturePublic,
    rarityTier,
    rarityScore
  } = useCameraReducer();

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
  const isRejectedRef = useRef(false);
  
  // Derive permission resolution status - no useState needed
  const permissionsResolved = permission?.status != null;
  
  // Use styled alerts
  const { showAlert } = useAlert();
  
  // Use our new custom hooks
  const { checkCaptureLimit, incrementCaptureCount, syncWithDatabase } = useCaptureLimitsWithPersistence(userId);
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
    dispatch(actions.resetIdentification());
    isRejectedRef.current = false;
  
    /** Fire the request again */
    try {
      await identify(lastIdentifyPayloadRef.current);
    } catch (err) {
      console.error("Retry identify failed:", err);
      dispatch(actions.vlmProcessingFailed());
      dispatch(actions.identificationComplete());
    }
  }, [
    identify,
    reset,
    lastIdentifyPayloadRef,
    dispatch,
    actions
  ]);

  // Initialize offline capture service
  useEffect(() => {
    if (userId) {
      initializeOfflineService(userId);
      // Also sync any pending capture count updates
      syncWithDatabase();
    }
  }, [userId, initializeOfflineService, syncWithDatabase]);

  // Debug modal queue state
  useEffect(() => {
    console.log("=== MODAL QUEUE STATE ===");
    console.log("isShowingModal:", isShowingModal);
    console.log("currentModal:", currentModal);
  }, [isShowingModal, currentModal]);

  // Watch for network errors during capture to trigger offline save
  useEffect(() => {
    if (idError && idError.message === 'Network request failed' && isCapturing && capturedUri && !savedOffline && userId) {
      console.log("[OFFLINE FLOW] Detected network error from useIdentify");
      
      // Set states to trigger offline save flow
      setSavedOffline(true);
      dispatch(actions.vlmProcessingStart());
      
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
        console.error("[OFFLINE FLOW] Failed to save offline capture:", error);
      });
    }
  }, [idError, isCapturing, capturedUri, savedOffline, userId, location, captureBox, saveOfflineCapture, dispatch, actions]);

  // Get user location
  useEffect(() => {
    if (!locationPermission?.granted) return;

    const getLocation = async () => {
      try {
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        dispatch(actions.setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude
        }));
        console.log("Location fetched successfully:", currentLocation.coords);
      } catch (error) {
        console.error("Error getting location:", error);
        dispatch(actions.setLocation(null));
      }
    };

    getLocation();
  }, [locationPermission?.granted, dispatch, actions]);

  // Request permissions on mount
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Safety valve - if we're stuck in capturing state for too long, reset
  useEffect(() => {
    if (isCapturing && !capturedUri) {
      const timeoutId = setTimeout(() => {
        if (isCapturing && !capturedUri) {
          console.warn("=== CAMERA STUCK IN CAPTURING STATE - FORCING RESET ===");
          dispatch(actions.captureFailed());
          cameraCaptureRef.current?.resetLasso();
        }
      }, 5000); // Give 5 seconds for normal flow
      
      return () => clearTimeout(timeoutId);
    }
  }, [isCapturing, capturedUri, dispatch, actions]);

  // Watch for tier1/tier2 results to update UI
  useEffect(() => {
    if (!tier1 && !tier2) {
      dispatch(actions.resetIdentification());
      dispatch(actions.resetMetadata());
      return;
    }

    if (tier1 !== null) {
      // Handle tier1 successful identification
      if (tier1.label) {
        console.log("==== SETTING TIER 1 IDENTIFICATION ====");
        console.log("tier1:", tier1);
        dispatch(actions.vlmProcessingSuccess(tier1.label));
        
        // Set rarity information if available
        if (tier1.rarityTier) {
          dispatch(actions.setRarity(tier1.rarityTier));
          console.log("Setting rarity tier:", tier1.rarityTier);
        } else {
          console.log("No rarity tier in tier1 response, using default");
        }
        
        // Set rarity score if available
        if (tier1.rarityScore !== undefined) {
          dispatch(actions.setRarity(tier1.rarityTier || rarityTier, tier1.rarityScore));
          console.log("Setting rarity score:", tier1.rarityScore);
        } else {
          console.log("No rarity score in tier1 response");
        }
        
        // Check if we're done (no tier 2 or tier 2 complete)
        if (!tier2 || tier2 !== null) {
          // No tier 2 processing or tier 2 is complete
          dispatch(actions.identificationComplete());
        }
      } else {
        console.log("Tier1 identification failed - no label.");
        // Don't set failure state - this will be handled by offline save logic
      }
    }

    // When tier2 results come in (or error)
    if (tier1 && !idLoading) { 
      // idLoading will be false when tier2 is done or errored
      console.log("==== IDENTIFICATION COMPLETE ====");
      console.log("tier1:", tier1);
      console.log("tier2:", tier2);

      dispatch(actions.identificationComplete());
      
      // If we have tier2 results and they have a label, use those labels
      if (tier2 && tier2.label) {
        // Make sure we have a successful result
        dispatch(actions.vlmProcessingSuccess(tier2.label));
      }
    }
  }, [tier1, tier2, idLoading, dispatch, actions, rarityTier]);

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
    dispatch(actions.resetIdentification());

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1, // Take high quality initially
        base64: false, // No need for base64 at this stage
        skipProcessing: false
      });

      // Start capture state - freeze UI
      console.log("=== SETTING isCapturing = true (lasso capture) ===");
      dispatch(actions.startCapture());
      // Set initial identifying state so polaroid shows "Identifying..." instead of "..."
      dispatch(actions.vlmProcessingStart());

      if (!photo) {
        throw new Error("Failed to capture photo");
      }

      // Process the capture using our new hook
      const processed = await processLassoCapture({
        photoUri: photo.uri,
        points,
        screenWidth: SCREEN_WIDTH,
        screenHeight: SCREEN_HEIGHT
      });

      // Store the captured URI and box for the animation
      dispatch(actions.captureSuccess(processed.croppedUri, processed.captureBox));

      if (!processed.vlmImage || !processed.vlmImage.base64) {
        console.warn("Failed to process cropped image for VLM or missing base64 data.");
        dispatch(actions.vlmProcessingFailed());
        dispatch(actions.resetCapture());
        return;
      }

      // Upload both full and cropped photos, get photo_url
      const [photoBlobResponse, croppedBlobResponse] = await Promise.all([
        uploadCapturePhoto(photo.uri),
        uploadCapturePhoto(processed.croppedUri)
      ]);

      if (!photoBlobResponse || !photoBlobResponse.ok || photoBlobResponse.status === 404) {
        console.error("Photo not uploaded successfully");
        dispatch(actions.vlmProcessingFailed());
        dispatch(actions.resetCapture());
        return;
      }

      const photoUrl = photoBlobResponse.url;
      const croppedUrl = croppedBlobResponse?.url;

      // Save payload for potential retry
      const identifyPayload: IdentifyRequest = {
        userId: userId!,
        image: processed.vlmImage.base64!,
        location: location || undefined,
        isRectangle: processed.captureBox.aspectRatio > 0.95 && processed.captureBox.aspectRatio < 1.05,
        captureMethod: "lasso",
        photo_url: photoUrl,
        cropped_url: croppedUrl
      };
      lastIdentifyPayloadRef.current = identifyPayload;

      // Check offline status before making network request
      if (!navigator.onLine) {
        console.log("[OFFLINE] No internet connection, saving capture for later");
        
        // Skip the identify call and go straight to offline save
        setSavedOffline(true);
        await saveOfflineCapture({
          capturedUri: processed.croppedUri,
          location: location || undefined,
          captureBox: processed.captureBox,
          userId: userId!,
          method: 'lasso',
          reason: 'offline_detected'
        });
        
        // Show modal and update counts
        cameraCaptureRef.current?.resetLasso();
        await incrementCaptureCount();
        enqueueModal({ type: 'offlineCapture' });
        
        // Only set null states, let the tier1/tier2 effects handle success states
        dispatch(actions.vlmProcessingStart()); // Keep null to trigger auto-dismiss
        // Don't set label yet - wait for tier1 response
        // Identification complete will be set by tier1/tier2 effects
      } else {
        // Make the identification request
        console.log("[CAPTURE] Making identification request with payload:", identifyPayload);
        await identify(identifyPayload);
        
        // Increment capture count after successful capture  
        await incrementCaptureCount();
        console.log("[CAPTURE] Incremented capture count");
      }
    } catch (error: any) {
      console.error("[CAPTURE] === CAPTURE ERROR ===", error);
      console.log("[CAPTURE] Error details:", {
        message: error?.message,
        stack: error?.stack,
        isOffline: !navigator.onLine,
        savedOffline
      });
      
      // Check if this is a network error and we haven't already saved offline
      if (error?.message === 'Network request failed' && !savedOffline && capturedUri && userId) {
        console.log("[OFFLINE FLOW] Network error detected, attempting offline save");
        setSavedOffline(true);
        
        try {
          await saveOfflineCapture({
            capturedUri,
            location: location || undefined,
            captureBox,
            userId,
            method: 'lasso',
            reason: 'network_error'
          });
          console.log("[OFFLINE FLOW] Successfully saved offline capture");
          cameraCaptureRef.current?.resetLasso();
          await incrementCaptureCount();
          enqueueModal({ type: 'offlineCapture' });
        } catch (saveError) {
          console.error("[OFFLINE FLOW] Failed to save offline capture", saveError);
          dispatch(actions.resetCapture());
        }
      } else {
        dispatch(actions.resetCapture());
        dispatch(actions.resetIdentification());
      }
    }
  }, [
    permission,
    requestPermission,
    posthog,
    checkCaptureLimit,
    processLassoCapture,
    uploadCapturePhoto,
    userId,
    location,
    identify,
    incrementCaptureCount,
    handleFirstCapture,
    savedOffline,
    setSavedOffline,
    capturedUri,
    captureBox,
    saveOfflineCapture,
    enqueueModal,
    dispatch,
    actions
  ]);

  const handleFullScreenCapture = useCallback(async () => {
    // Reset VLM state for new capture
    dispatch(actions.resetIdentification());

    if (!checkCaptureLimit()) return;

    dispatch(actions.startCapture());
    // Set initial identifying state
    dispatch(actions.vlmProcessingStart());

    try {
      if (!cameraCaptureRef.current) {
        dispatch(actions.captureFailed());
        return;
      }

      const photo = await cameraCaptureRef.current.getCamera()?.takePictureAsync({
        quality: 1,
        base64: false,
        skipProcessing: false
      });

      if (!photo) {
        throw new Error("Failed to capture photo");
      }

      dispatch(actions.captureSuccess(photo.uri));

      // Process the capture using our new hook
      const processed = await processFullScreenCapture({
        photoUri: photo.uri,
        screenWidth: SCREEN_WIDTH,
        screenHeight: SCREEN_HEIGHT
      });

      // Update capture box with the processed dimensions
      dispatch(actions.setCaptureBox(processed.captureBox));

      if (!processed.vlmImage || !processed.vlmImage.base64) {
        console.warn("Failed to process full screen image for VLM.");
        dispatch(actions.vlmProcessingFailed());
        dispatch(actions.resetCapture());
        return;
      }

      // Upload the photo
      const photoBlobResponse = await uploadCapturePhoto(photo.uri);
      
      if (!photoBlobResponse || !photoBlobResponse.ok) {
        console.error("Photo not uploaded successfully");
        dispatch(actions.vlmProcessingFailed());
        dispatch(actions.resetCapture());
        return;
      }

      const photoUrl = photoBlobResponse.url;

      // Check offline status before making network request
      if (!navigator.onLine && userId) {
        console.log("[OFFLINE] No internet connection, saving full screen capture for later");
        
        setSavedOffline(true);
        await saveOfflineCapture({
          capturedUri: photo.uri,
          location: location || undefined,
          captureBox: processed.captureBox,
          userId,
          method: 'fullscreen',
          reason: 'offline_detected'
        });
        
        cameraCaptureRef.current?.resetLasso();
        await incrementCaptureCount();
        enqueueModal({ type: 'offlineCapture' });
        
        dispatch(actions.vlmProcessingSuccess("")); // This will prevent error state
        dispatch(actions.identificationComplete());
      } else {
        // Save payload for potential retry
        const identifyPayload: IdentifyRequest = {
          userId: userId!,
          image: processed.vlmImage.base64,
          location: location || undefined,
          isRectangle: true,
          captureMethod: "fullscreen",
          photo_url: photoUrl
        };
        lastIdentifyPayloadRef.current = identifyPayload;

        await identify(identifyPayload);
        await incrementCaptureCount();
      }
    } catch (error: any) {
      console.error("Full screen capture failed:", error);
      
      // Check if this is a network error and we haven't already saved offline
      if (error?.message === 'Network request failed' && !savedOffline && capturedUri && userId) {
        console.log("[OFFLINE FLOW] Network error in fullscreen capture, attempting offline save");
        setSavedOffline(true);
        
        try {
          await saveOfflineCapture({
            capturedUri,
            location: location || undefined,
            captureBox,
            userId,
            method: 'fullscreen',
            reason: 'network_error'
          });
          cameraCaptureRef.current?.resetLasso();
          await incrementCaptureCount();
          enqueueModal({ type: 'offlineCapture' });
        } catch (saveError) {
          console.error("[OFFLINE FLOW] Failed to save offline capture", saveError);
          dispatch(actions.captureFailed());
          dispatch(actions.resetCapture());
          dispatch(actions.vlmProcessingFailed());
        }
      } else {
        dispatch(actions.captureFailed());
        dispatch(actions.resetCapture());
        dispatch(actions.resetIdentification());
      }
    }
  }, [
    checkCaptureLimit,
    processFullScreenCapture,
    uploadCapturePhoto,
    userId,
    location,
    identify,
    incrementCaptureCount,
    savedOffline,
    setSavedOffline,
    capturedUri,
    captureBox,
    saveOfflineCapture,
    enqueueModal,
    dispatch,
    actions
  ]);

  const handleSaveCapture = useCallback(async () => {
    if (!userId || !identifiedLabel || !capturedUri) return;
    
    try {
      // Create a capture record in the database
      const newCapture: Omit<Capture, 'id' | 'created_at'> = {
        user_id: userId,
        item_label: identifiedLabel,
        photo_url: capturedUri,
        location: location ? {
          type: 'Point',
          coordinates: [location.longitude, location.latitude]
        } : null,
        is_public: isCapturePublic,
        capture_method: captureBox.aspectRatio > 0.95 && captureBox.aspectRatio < 1.05 ? "fullscreen" : "lasso",
        confidence_score: tier1?.confidence || null,
        rarity_tier: rarityTier,
        rarity_score: rarityScore
      };

      // Save to captures table
      const { error: captureError } = await supabase
        .from('captures')
        .insert(newCapture);

      if (captureError) {
        console.error("Failed to save capture:", captureError);
        showAlert({
          title: "Save Failed",
          message: "Unable to save your capture. Please try again.",
          icon: "close-circle-outline",
          iconColor: "#EF4444"
        });
        return;
      }

      // Update user's item inventory
      await incrementOrCreateItem(identifiedLabel);

      // Award coins and XP
      const coinsAwarded = await calculateAndAwardCoins(userId, identifiedLabel, isCapturePublic);
      const xpAwarded = await calculateAndAwardCaptureXP(userId, identifiedLabel, rarityTier);

      console.log(`Awarded ${coinsAwarded} coins and ${xpAwarded} XP for capturing ${identifiedLabel}`);

      // Check collection status
      const collectionItems = await fetchCollectionItems();
      const collectionItem = collectionItems.find(item => 
        item.item_label.toLowerCase() === identifiedLabel.toLowerCase()
      );

      if (collectionItem) {
        const hasItem = await checkUserHasCollectionItem(userId, collectionItem.id);
        
        if (!hasItem) {
          // Award collection item
          await createUserCollectionItem({
            user_id: userId,
            collection_item_id: collectionItem.id,
            obtained_at: new Date()
          });
          
          // Queue collection modal
          enqueueModal({
            type: 'collectionUnlock',
            data: {
              itemLabel: identifiedLabel,
              itemImage: capturedUri,
              collectionName: collectionItem.collection?.name || 'Unknown Collection',
              collectionId: collectionItem.collection_id
            }
          });
        }
      }

      showAlert({
        title: "Capture Saved!",
        message: `${identifiedLabel} has been added to your collection.`,
        icon: "checkmark-circle-outline",
        iconColor: "#10B981"
      });

    } catch (error) {
      console.error("Error saving capture:", error);
      showAlert({
        title: "Save Failed",
        message: "An unexpected error occurred. Please try again.",
        icon: "close-circle-outline",
        iconColor: "#EF4444"
      });
    }
  }, [
    userId,
    identifiedLabel,
    capturedUri,
    location,
    isCapturePublic,
    captureBox,
    tier1,
    rarityTier,
    rarityScore,
    incrementOrCreateItem,
    showAlert,
    enqueueModal
  ]);

  const dismissPolaroid = useCallback(() => {
    console.log("=== DISMISSING POLAROID ===");
    console.log("Current state:", {
      isCapturing,
      capturedUri,
      vlmCaptureSuccess,
      identifiedLabel,
      identificationComplete
    });

    // Queue post-capture modals if we have a successful identification
    if (vlmCaptureSuccess && identifiedLabel && !savedOffline) {
      queuePostCaptureModals({
        identifiedLabel,
        capturedUri: capturedUri || '',
        userId: userId || ''
      });
    }

    // Reset capture state after successful identification
    dispatch(actions.captureFailed());
    dispatch(actions.resetCapture());
    // Reset VLM state for next capture
    dispatch(actions.resetIdentification());
    dispatch(actions.setPublicStatus(true)); // Reset to default public status
    
    // Reset lasso after state updates
    cameraCaptureRef.current?.resetLasso();
    
    // Reset offline state
    setSavedOffline(false);
  }, [
    isCapturing,
    capturedUri,
    vlmCaptureSuccess,
    identifiedLabel,
    identificationComplete,
    savedOffline,
    queuePostCaptureModals,
    userId,
    setSavedOffline,
    dispatch,
    actions
  ]);

  // Debug logging for state changes
  useEffect(() => {
    console.log("=== CAMERA STATE UPDATE ===");
    console.log("isCapturing:", isCapturing);
    console.log("capturedUri:", capturedUri);
    console.log("vlmCaptureSuccess:", vlmCaptureSuccess);
    console.log("identifiedLabel:", identifiedLabel);
    console.log("identificationComplete:", identificationComplete);
    console.log("idLoading:", idLoading);
    console.log("idError:", idError);
    console.log("savedOffline:", savedOffline);
  }, [isCapturing, capturedUri, vlmCaptureSuccess, identifiedLabel, identificationComplete, idLoading, idError, savedOffline]);

  if (!permissionsResolved) {
    return <CameraPlaceholder onRequestPermission={requestPermission} />;
  }

  if (!permission?.granted) {
    return <CameraPlaceholder onRequestPermission={requestPermission} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} {...panResponder.panHandlers}>
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        <CameraCapture
          ref={cameraCaptureRef}
          onCapture={handleCapture}
          onFullScreenCapture={handleFullScreenCapture}
          isCapturing={isCapturing}
          disabled={isCapturing}
        />
        
        {showTutorialOverlay && (
          <CameraTutorialOverlay onDismiss={() => setShowTutorialOverlay(false)} />
        )}
        
        <PolaroidDevelopment
          isCapturing={isCapturing}
          capturedUri={capturedUri}
          captureBox={captureBox}
          onDismiss={dismissPolaroid}
          identifiedLabel={identifiedLabel}
          vlmCaptureSuccess={vlmCaptureSuccess}
          onRetry={handleRetryIdentification}
          error={polaroidError}
          identificationComplete={identificationComplete}
          savedOffline={savedOffline}
          onSetPublic={(value) => dispatch(actions.setPublicStatus(value))}
          isPublic={isCapturePublic}
          rarityTier={rarityTier}
        />
      </View>
    </GestureHandlerRootView>
  );
}