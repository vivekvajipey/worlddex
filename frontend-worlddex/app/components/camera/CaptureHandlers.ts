import { RefObject } from 'react';
import { CameraView } from 'expo-camera';
import { PostHog } from 'posthog-react-native';
import { CameraDispatch, CameraActions } from '../../../src/hooks/useCameraReducer';
import { IdentifyRequest } from '../../../../shared/types/identify';
import { UseIdentifyResult } from '../../../src/hooks/useIdentify';
import { UsePhotoUploadResult } from '../../../src/hooks/usePhotoUpload';
import { CameraCaptureHandle } from './CameraCapture';
import type { Capture, CollectionItem } from '../../../database/types';
import { processCaptureAfterIdentification } from '../../../src/services/captureProcessingService';

interface CaptureHandlerDependencies {
  // State from reducer
  dispatch: CameraDispatch;
  actions: CameraActions;
  location: { latitude: number; longitude: number } | null;
  capturedUri: string | null;
  captureBox: { x: number; y: number; width: number; height: number } | null;
  rarityTier: string;
  rarityScore?: number;
  isCapturePublic: boolean;
  
  // External hooks
  identify: UseIdentifyResult['identify'];
  uploadPhoto: UsePhotoUploadResult['uploadPhoto'];
  uploadCapturePhoto: UsePhotoUploadResult['uploadCapturePhoto'];
  incrementOrCreateItem: (label: string) => Promise<any>;
  incrementUserField: (userId: string, field: string, value?: number) => Promise<boolean>;
  fetchUserCollectionsByUser: (userId: string) => Promise<any[]>;
  fetchCollectionItems: (collectionId: string) => Promise<any[]>;
  checkUserHasCollectionItem: (userId: string, collectionItemId: string) => Promise<boolean>;
  createUserCollectionItem: (data: any) => Promise<any>;
  checkCaptureLimit: () => boolean;
  incrementCaptureCount: () => Promise<void>;
  trackIdentifyAttempt: () => boolean;
  processLassoCapture: (params: any) => Promise<any>;
  processFullScreenCapture: (params: any) => Promise<any>;
  handleFirstCapture: () => Promise<void>;
  saveOfflineCapture: (params: any) => Promise<void>;
  queuePostCaptureModals: (params: any) => void;
  
  // Refs
  lastIdentifyPayloadRef: RefObject<IdentifyRequest | null>;
  cameraCaptureRef: RefObject<CameraCaptureHandle>;
  
  // Other state
  userId: string | null;
  savedOffline: boolean;
  setSavedOffline: (value: boolean) => void;
  posthog?: PostHog | null;
  permission?: { granted: boolean } | null;
  requestPermission?: () => Promise<any>;
}

export const createCaptureHandlers = (deps: CaptureHandlerDependencies) => {
  const {
    dispatch,
    actions,
    location,
    capturedUri,
    captureBox,
    rarityTier,
    rarityScore,
    isCapturePublic,
    identify,
    uploadPhoto,
    uploadCapturePhoto,
    incrementOrCreateItem,
    incrementUserField,
    fetchUserCollectionsByUser,
    fetchCollectionItems,
    checkUserHasCollectionItem,
    createUserCollectionItem,
    checkCaptureLimit,
    incrementCaptureCount,
    trackIdentifyAttempt,
    processLassoCapture,
    processFullScreenCapture,
    handleFirstCapture,
    saveOfflineCapture,
    queuePostCaptureModals,
    lastIdentifyPayloadRef,
    cameraCaptureRef,
    userId,
    savedOffline,
    setSavedOffline,
    posthog,
    permission,
    requestPermission
  } = deps;

  const handleCapture = async (
    points: { x: number; y: number }[],
    cameraRef: RefObject<CameraView>,
    viewWidth: number,
    viewHeight: number
  ) => {
    // Handle first capture tutorial flow
    await handleFirstCapture();
    
    // Check camera permission first
    if (!permission?.granted) {
      if (requestPermission) {
        await requestPermission();
      }
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

    // Check identify API limits
    if (!trackIdentifyAttempt()) {
      console.log("[CAPTURE] Identify limit reached");
      dispatch(actions.captureFailed());
      cameraCaptureRef.current?.resetLasso();
      return;
    }

    // Reset VLM state for new capture
    dispatch(actions.resetIdentification());

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        base64: false,
        skipProcessing: false
      });

      // Start capture state - freeze UI
      console.log("=== SETTING isCapturing = true (lasso capture) ===");
      dispatch(actions.startCapture());
      dispatch(actions.vlmProcessingStart());

      if (!photo) {
        throw new Error("Failed to capture photo");
      }

      // console.log("[CAPTURE] Photo dimensions:", { width: photo.width, height: photo.height });
      // console.log("[CAPTURE] Screen dimensions:", { width: viewWidth, height: viewHeight });
      // console.log("[CAPTURE] Lasso points:", points);

      // Process the capture using actual photo dimensions
      const processed = await processLassoCapture({
        photoUri: photo.uri,
        points,
        photoWidth: photo.width,
        photoHeight: photo.height
      });

      // Store the captured URI and box for the animation
      dispatch(actions.captureSuccess(processed.croppedUri, processed.captureBox));

      if (!processed.vlmImage || !processed.vlmImage.base64) {
        console.warn("Failed to process cropped image for VLM or missing base64 data.");
        dispatch(actions.vlmProcessingFailed());
        dispatch(actions.resetCapture());
        return;
      }

      // Note: We don't upload to S3 here anymore - that happens after successful identification

      // Save payload for potential retry
      const identifyPayload: IdentifyRequest = {
        base64Data: processed.vlmImage.base64!,
        contentType: 'image/jpeg',
        gps: location ? { lat: location.latitude, lng: location.longitude } : null
      };
      lastIdentifyPayloadRef.current = identifyPayload;

      // Make the identification request
      // console.log("[CAPTURE] Making identification request with payload:", identifyPayload);
      await identify(identifyPayload);
      
      // Note: incrementCaptureCount is called in dismissPolaroid after user accepts
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
          // Don't increment count here - will be incremented when identified later
          console.log('[OFFLINE] Capture saved for later - count will increment when identified');
        } catch (saveError) {
          console.error("[OFFLINE FLOW] Failed to save offline capture", saveError);
          dispatch(actions.resetCapture());
        }
      } else {
        dispatch(actions.resetCapture());
        dispatch(actions.resetIdentification());
      }
    }
  };

  const handleFullScreenCapture = async (screenWidth: number, screenHeight: number) => {
    // Reset VLM state for new capture
    dispatch(actions.resetIdentification());

    if (!checkCaptureLimit()) return;

    // Check identify API limits
    if (!trackIdentifyAttempt()) {
      console.log("[CAPTURE] Identify limit reached");
      dispatch(actions.captureFailed());
      return;
    }

    dispatch(actions.startCapture());
    dispatch(actions.vlmProcessingStart());

    try {
      if (!cameraCaptureRef.current) {
        dispatch(actions.captureFailed());
        return;
      }

      const photo = await cameraCaptureRef.current.getCameraRef()?.current?.takePictureAsync({
        quality: 1,
        base64: false,
        skipProcessing: false
      });

      if (!photo) {
        throw new Error("Failed to capture photo");
      }

      dispatch(actions.captureSuccess(photo.uri));

      // Process the capture using actual photo dimensions
      const processed = await processFullScreenCapture({
        photoUri: photo.uri,
        photoWidth: photo.width,
        photoHeight: photo.height
      });

      // Update capture box with the processed dimensions
      dispatch(actions.setCaptureBox(processed.captureBox));

      if (!processed.vlmImage || !processed.vlmImage.base64) {
        console.warn("Failed to process full screen image for VLM.");
        dispatch(actions.vlmProcessingFailed());
        dispatch(actions.resetCapture());
        return;
      }

      // Note: We don't upload to S3 here anymore - that happens after successful identification

      // Save payload for potential retry
      const identifyPayload: IdentifyRequest = {
        base64Data: processed.vlmImage.base64,
        contentType: 'image/jpeg',
        gps: location ? { lat: location.latitude, lng: location.longitude } : null
      };
      lastIdentifyPayloadRef.current = identifyPayload;

      await identify(identifyPayload);
      // Note: incrementCaptureCount is called in dismissPolaroid after user accepts
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
            method: 'full_screen',
            reason: 'network_error'
          });
          cameraCaptureRef.current?.resetLasso();
          // Don't increment count here - will be incremented when identified later
          console.log('[OFFLINE] Capture saved for later - count will increment when identified');
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
  };

  const handleRetryIdentification = async (
    reset: UseIdentifyResult['reset']
  ) => {
    if (!lastIdentifyPayloadRef.current) return;

    await new Promise(res => {
      reset();
      requestAnimationFrame(res);
    });
  
    reset();
    dispatch(actions.resetIdentification());
  
    try {
      await identify(lastIdentifyPayloadRef.current);
    } catch (err) {
      console.error("Retry identify failed:", err);
      dispatch(actions.vlmProcessingFailed());
      dispatch(actions.identificationComplete());
    }
  };

  const dismissPolaroid = async (
    isCapturing: boolean,
    capturedUri: string | null,
    vlmCaptureSuccess: boolean | null,
    identifiedLabel: string | null,
    identificationComplete: boolean,
    isRejected: boolean,
    tier1Response?: any
  ) => {
    // console.log("=== DISMISSING POLAROID ===");
    // console.log("Current state:", {
    //   isCapturing,
    //   capturedUri,
    //   vlmCaptureSuccess,
    //   identifiedLabel,
    //   identificationComplete,
    //   isRejected
    // });

    // Handle successful identification - save to database
    if (
      identificationComplete &&
      vlmCaptureSuccess === true &&
      identifiedLabel &&
      capturedUri &&
      userId &&
      !isRejected &&
      !savedOffline
    ) {
      try {
        const result = await processCaptureAfterIdentification({
          userId,
          identifiedLabel,
          capturedUri,
          isCapturePublic,
          rarityTier,
          rarityScore,
          tier1Response,
          enableTemporaryCapture: true, // Enable for immediate display in WorldDex
          services: {
            incrementOrCreateItem,
            uploadCapturePhoto: (uri: string, type: string, filename: string, payload: any) => 
              uploadCapturePhoto(uri, type, filename, payload), // No timestamp for online captures
            incrementCaptureCount,
            fetchUserCollectionsByUser,
            fetchCollectionItems,
            checkUserHasCollectionItem,
            createUserCollectionItem
          }
        });

        if (result.success && result.captureRecord) {
          // console.log("[CAPTURE] Successfully saved to database, queueing modals...");
          // Queue post-capture modals with the capture ID
          await queuePostCaptureModals({
            userId,
            captureId: result.captureRecord.id,
            itemName: identifiedLabel,
            rarityTier,
            xpValue: result.xpAwarded,
            isGlobalFirst: result.isGlobalFirst
          });
        } else {
          console.error("[CAPTURE] Failed to process capture:", result.error);
        }
      } catch (error) {
        console.error("[CAPTURE] Error saving capture to database:", error);
        // Could show an error alert here if needed
      }
    } else {
      // Log why we're not saving
      if (isRejected) {
        console.log("[CAPTURE] Not saving: User rejected the capture");
      } else if (!identificationComplete) {
        console.log("[CAPTURE] Not saving: Identification not complete");
      } else if (vlmCaptureSuccess !== true) {
        console.log("[CAPTURE] Not saving: VLM capture was not successful");
      } else if (!identifiedLabel) {
        console.log("[CAPTURE] Not saving: No identified label");
      } else if (!capturedUri) {
        console.log("[CAPTURE] Not saving: No captured URI");
      } else if (!userId) {
        console.log("[CAPTURE] Not saving: No user ID");
      }
    }

    // Reset capture state
    dispatch(actions.captureFailed());
    dispatch(actions.resetCapture());
    dispatch(actions.resetIdentification());
    dispatch(actions.setPublicStatus(true));
    
    cameraCaptureRef.current?.resetLasso();
    setSavedOffline(false);
    
    // Note: The caller should reset isRejectedRef after calling this function
  };

  return {
    handleCapture,
    handleFullScreenCapture,
    handleRetryIdentification,
    dismissPolaroid
  };
};