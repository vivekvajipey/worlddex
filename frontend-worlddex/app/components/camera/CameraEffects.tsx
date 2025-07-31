import { useEffect, RefObject } from 'react';
import * as Location from 'expo-location';
import { CameraDispatch, CameraActions } from '../../../src/hooks/useCameraReducer';
import { IdentifyRequest } from '../../../../shared/types/identify';
import { UseIdentifyResult } from '../../../src/hooks/useIdentify';
import { CameraCaptureHandle } from './CameraCapture';

interface CameraEffectsProps {
  // State from reducer
  dispatch: CameraDispatch;
  actions: CameraActions;
  isCapturing: boolean;
  capturedUri: string | null;
  captureBox: { x: number; y: number; width: number; height: number } | null;
  location: { latitude: number; longitude: number } | null;
  rarityTier: string;
  
  // VLM results
  tier1: UseIdentifyResult['tier1'];
  tier2: UseIdentifyResult['tier2'];
  idLoading: UseIdentifyResult['isLoading'];
  idError: UseIdentifyResult['error'];
  
  // External dependencies
  userId: string | null;
  initializeOfflineService: (userId: string) => void;
  syncWithDatabase: () => void;
  saveOfflineCapture: (params: any) => Promise<void>;
  setSavedOffline: (value: boolean) => void;
  savedOffline: boolean;
  locationPermission: Location.LocationPermissionResponse | null;
  cameraCaptureRef: RefObject<CameraCaptureHandle>;
  isShowingModal: boolean;
  currentModal: any;
}

export const CameraEffects: React.FC<CameraEffectsProps> = ({
  dispatch,
  actions,
  isCapturing,
  capturedUri,
  captureBox,
  location,
  rarityTier,
  tier1,
  tier2,
  idLoading,
  idError,
  userId,
  initializeOfflineService,
  syncWithDatabase,
  saveOfflineCapture,
  setSavedOffline,
  savedOffline,
  locationPermission,
  cameraCaptureRef,
  isShowingModal,
  currentModal
}) => {
  // Initialize offline capture service
  useEffect(() => {
    if (userId) {
      initializeOfflineService(userId);
      // Also sync any pending capture count updates
      syncWithDatabase();
    }
  }, [userId, initializeOfflineService, syncWithDatabase]);

  // Debug modal queue state
  // useEffect(() => {
  //   console.log("=== MODAL QUEUE STATE ===");
  //   console.log("isShowingModal:", isShowingModal);
  //   console.log("currentModal:", currentModal);
  // }, [isShowingModal, currentModal]);

  // Watch for network errors during capture to trigger offline save
  useEffect(() => {
    if (idError && idError.message === 'Network request failed' && capturedUri && !savedOffline && userId) {
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
  }, [idError, capturedUri, savedOffline, userId, location, captureBox, saveOfflineCapture, dispatch, actions, cameraCaptureRef, setSavedOffline]);

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
  }, [isCapturing, capturedUri, dispatch, actions, cameraCaptureRef]);

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
        // Set failure state to trigger ripping animation for unidentified objects
        dispatch(actions.vlmProcessingFailed());
        dispatch(actions.identificationComplete());
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

  // This component doesn't render anything
  return null;
};

export default CameraEffects;