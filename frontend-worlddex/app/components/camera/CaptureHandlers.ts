import { RefObject } from 'react';
import { CameraView } from 'expo-camera';
import { PostHog } from 'posthog-react-native';
import { CameraDispatch, CameraActions } from '../../../src/hooks/useCameraReducer';
import { IdentifyRequest } from '../../../../shared/types/identify';
import { UseIdentifyResult } from '../../../src/hooks/useIdentify';
import { UsePhotoUploadResult } from '../../../src/hooks/usePhotoUpload';
import { CameraCaptureHandle } from './CameraCapture';
import type { Capture, CollectionItem } from '../../../database/types';

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

      console.log("[CAPTURE] Photo dimensions:", { width: photo.width, height: photo.height });
      console.log("[CAPTURE] Screen dimensions:", { width: viewWidth, height: viewHeight });
      console.log("[CAPTURE] Lasso points:", points);

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
      
      await incrementCaptureCount();
      console.log("[CAPTURE] Incremented capture count");
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
      await incrementCaptureCount();
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

  const dismissPolaroid = async (
    isCapturing: boolean,
    capturedUri: string | null,
    vlmCaptureSuccess: boolean | null,
    identifiedLabel: string | null,
    identificationComplete: boolean,
    isRejected: boolean
  ) => {
    console.log("=== DISMISSING POLAROID ===");
    console.log("Current state:", {
      isCapturing,
      capturedUri,
      vlmCaptureSuccess,
      identifiedLabel,
      identificationComplete,
      isRejected
    });

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
        console.log("[CAPTURE] Getting/creating item for label:", identifiedLabel);
        const { item, isGlobalFirst } = await incrementOrCreateItem(identifiedLabel);
        
        if (!item) {
          console.error("[CAPTURE] Failed to create or increment item for label:", identifiedLabel);
          return;
        }

        // Create capture payload
        const capturePayload: Omit<Capture, "id" | "captured_at" | "segmented_image_key" | "thumb_key"> = {
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

        // Upload photo and create capture record
        console.log("[CAPTURE] Uploading photo and creating capture record");
        const captureRecord = await uploadCapturePhoto(
          capturedUri,
          "image/jpeg",
          `${Date.now()}.jpg`,
          capturePayload
        );

        if (!captureRecord) {
          console.error("[CAPTURE] Failed to create capture record");
          return;
        }

        // Handle collections
        console.log("[CAPTURE] Checking if capture matches any collection items...");
        try {
          const userCollections = await fetchUserCollectionsByUser(userId);
          console.log(`[CAPTURE] Found ${userCollections.length} user collections to check`);

          for (const userCollection of userCollections) {
            const collectionItems = await fetchCollectionItems(userCollection.collection_id);
            
            // Filter items that match the identified label
            const matchingItems = collectionItems.filter((ci: any) => {
              const itemNameMatch = ci.name?.toLowerCase() === identifiedLabel.toLowerCase();
              const displayNameMatch = ci.display_name?.toLowerCase() === identifiedLabel.toLowerCase();
              return itemNameMatch || displayNameMatch;
            });

            console.log(`[CAPTURE] Found ${matchingItems.length} matching items in collection ${userCollection.collection_id}`);

            // Add matching items to user's collection
            for (const collectionItem of matchingItems) {
              try {
                const hasItem = await checkUserHasCollectionItem(userId, collectionItem.id);
                
                if (!hasItem) {
                  await createUserCollectionItem({
                    user_id: userId,
                    collection_item_id: collectionItem.id,
                    capture_id: captureRecord.id,
                    collection_id: collectionItem.collection_id,
                  });
                  console.log(`[CAPTURE] Added ${identifiedLabel} to collection ${collectionItem.collection_id}`);
                }
              } catch (collectionErr) {
                console.error('[CAPTURE] Error adding item to user collection:', collectionErr);
                // Continue with next item even if this one fails
              }
            }
          }
        } catch (collectionErr) {
          console.error('[CAPTURE] Error handling collections:', collectionErr);
          // Non-critical error, continue
        }

        // Increment user stats
        console.log('[CAPTURE] Incrementing user stats');
        await incrementUserField(userId, "daily_captures_used", 1);
        await incrementUserField(userId, "total_captures", 1);

        console.log("[CAPTURE] Successfully saved to database, queueing modals...");
        // Queue post-capture modals with the capture ID
        await queuePostCaptureModals({
          userId,
          captureId: captureRecord.id,
          itemName: identifiedLabel,
          rarityTier,
          xpValue: undefined, // Could be passed from tier1 response if available
          isGlobalFirst
        });
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