import { RefObject } from 'react';
import { CameraView } from 'expo-camera';
import { PostHog } from 'posthog-react-native';
import { CameraDispatch, CameraActions } from '../../../src/hooks/useCameraReducer';
import { IdentifyRequest } from '../../../../shared/types/identify';
import { UseIdentifyResult } from '../../../src/hooks/useIdentify';
import { UsePhotoUploadResult } from '../../../src/hooks/usePhotoUpload';
import { CameraCaptureHandle } from './CameraCapture';

interface CaptureHandlerDependencies {
  // State from reducer
  dispatch: CameraDispatch;
  actions: CameraActions;
  location: { latitude: number; longitude: number } | null;
  capturedUri: string | null;
  captureBox: { x: number; y: number; width: number; height: number } | null;
  rarityTier: string;
  
  // External hooks
  identify: UseIdentifyResult['identify'];
  uploadPhoto: UsePhotoUploadResult['uploadPhoto'];
  checkCaptureLimit: () => boolean;
  incrementCaptureCount: () => Promise<void>;
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
    identify,
    uploadPhoto,
    checkCaptureLimit,
    incrementCaptureCount,
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
    screenWidth: number,
    screenHeight: number
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

      // Process the capture
      const processed = await processLassoCapture({
        photoUri: photo.uri,
        points,
        photoWidth: screenWidth,
        photoHeight: screenHeight
      });

      // Store the captured URI and box for the animation
      dispatch(actions.captureSuccess(processed.croppedUri, processed.captureBox));

      if (!processed.vlmImage || !processed.vlmImage.base64) {
        console.warn("Failed to process cropped image for VLM or missing base64 data.");
        dispatch(actions.vlmProcessingFailed());
        dispatch(actions.resetCapture());
        return;
      }

      // Upload both full and cropped photos to S3
      const [photoUrl, croppedUrl] = await Promise.all([
        uploadPhoto(photo.uri, 'image/jpeg', `capture-${Date.now()}.jpg`),
        uploadPhoto(processed.croppedUri, 'image/jpeg', `capture-cropped-${Date.now()}.jpg`)
      ]);

      if (!photoUrl) {
        console.error("Photo not uploaded successfully");
        dispatch(actions.vlmProcessingFailed());
        dispatch(actions.resetCapture());
        return;
      }

      // Save payload for potential retry
      const identifyPayload: IdentifyRequest = {
        base64Data: processed.vlmImage.base64!,
        contentType: 'image/jpeg',
        gps: location ? { lat: location.latitude, lng: location.longitude } : null
      };
      lastIdentifyPayloadRef.current = identifyPayload;

      // Check offline status before making network request
      if (!navigator.onLine) {
        console.log("[OFFLINE] No internet connection, saving capture for later");
        
        setSavedOffline(true);
        await saveOfflineCapture({
          capturedUri: processed.croppedUri,
          location: location || undefined,
          captureBox: processed.captureBox,
          userId: userId!,
          method: 'lasso',
          reason: 'offline_detected'
        });
        
        cameraCaptureRef.current?.resetLasso();
        await incrementCaptureCount();
        console.log('[OFFLINE] Capture saved for later');
        
        dispatch(actions.vlmProcessingStart());
      } else {
        // Make the identification request
        console.log("[CAPTURE] Making identification request with payload:", identifyPayload);
        await identify(identifyPayload);
        
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
          console.log('[OFFLINE] Capture saved for later');
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

      // Process the capture
      const processed = await processFullScreenCapture({
        photoUri: photo.uri,
        photoWidth: screenWidth,
        photoHeight: screenHeight
      });

      // Update capture box with the processed dimensions
      dispatch(actions.setCaptureBox(processed.captureBox));

      if (!processed.vlmImage || !processed.vlmImage.base64) {
        console.warn("Failed to process full screen image for VLM.");
        dispatch(actions.vlmProcessingFailed());
        dispatch(actions.resetCapture());
        return;
      }

      // Upload the photo to S3
      const photoUrl = await uploadPhoto(photo.uri, 'image/jpeg', `capture-fullscreen-${Date.now()}.jpg`);
      
      if (!photoUrl) {
        console.error("Photo not uploaded successfully");
        dispatch(actions.vlmProcessingFailed());
        dispatch(actions.resetCapture());
        return;
      }

      // Check offline status before making network request
      if (!navigator.onLine && userId) {
        console.log("[OFFLINE] No internet connection, saving full screen capture for later");
        
        setSavedOffline(true);
        await saveOfflineCapture({
          capturedUri: photo.uri,
          location: location || undefined,
          captureBox: processed.captureBox,
          userId,
          method: 'full_screen',
          reason: 'offline_detected'
        });
        
        cameraCaptureRef.current?.resetLasso();
        await incrementCaptureCount();
        console.log('[OFFLINE] Capture saved for later');
        
        dispatch(actions.vlmProcessingSuccess(""));
        dispatch(actions.identificationComplete());
      } else {
        // Save payload for potential retry
        const identifyPayload: IdentifyRequest = {
          base64Data: processed.vlmImage.base64,
          contentType: 'image/jpeg',
          gps: location ? { lat: location.latitude, lng: location.longitude } : null
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
            method: 'full_screen',
            reason: 'network_error'
          });
          cameraCaptureRef.current?.resetLasso();
          await incrementCaptureCount();
          console.log('[OFFLINE] Capture saved for later');
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

  const dismissPolaroid = (
    isCapturing: boolean,
    capturedUri: string | null,
    vlmCaptureSuccess: boolean | null,
    identifiedLabel: string | null,
    identificationComplete: boolean
  ) => {
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
        itemName: identifiedLabel,
        captureId: capturedUri || '',
        userId: userId || '',
        rarityTier: rarityTier
      });
    }

    // Reset capture state after successful identification
    dispatch(actions.captureFailed());
    dispatch(actions.resetCapture());
    dispatch(actions.resetIdentification());
    dispatch(actions.setPublicStatus(true));
    
    cameraCaptureRef.current?.resetLasso();
    setSavedOffline(false);
  };

  return {
    handleCapture,
    handleFullScreenCapture,
    handleRetryIdentification,
    dismissPolaroid
  };
};