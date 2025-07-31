import React, { useRef, useCallback } from "react";
import { View, Dimensions } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { usePostHog } from "posthog-react-native";

import CameraCapture, { CameraCaptureHandle } from "../components/camera/CameraCapture";
import PolaroidDevelopment from "../components/camera/PolaroidDevelopment";
import CameraTutorialOverlay from "../components/camera/CameraTutorialOverlay";
import { CameraPlaceholder } from "../components/camera/CameraPlaceholder";
import { CameraDebugLogger } from "../components/camera/CameraDebugLogger";
import { CameraPermissionHandler } from "../components/camera/CameraPermissionHandler";
import { CameraEffects } from "../components/camera/CameraEffects";
import { createCaptureHandlers } from "../components/camera/CaptureHandlers";
import { useIdentify } from "../../src/hooks/useIdentify";
import { usePhotoUpload } from "../../src/hooks/usePhotoUpload";
import { useAuth } from "../../src/contexts/AuthContext";
import { IdentifyRequest } from "../../../shared/types/identify";
import { useModalQueue } from "../../src/contexts/ModalQueueContext";
import { TestModalFailsafeButton } from "../components/TestModalFailsafeButton";

// Import new custom hooks
import { useCaptureLimitsWithPersistence } from "../../src/hooks/useCaptureLimitsWithPersistence";
import { useTutorialFlow } from "../../src/hooks/useTutorialFlow";
import { useOfflineCapture } from "../../src/hooks/useOfflineCapture";
import { useCaptureProcessing } from "../../src/hooks/useCaptureProcessing";
import { useModalSequence } from "../../src/hooks/useModalSequence";
import { useCameraReducer } from "../../src/hooks/useCameraReducer";
import { useItems } from "../../database/hooks/useItems";
import { incrementUserField, useUser } from "../../database/hooks/useUsers";
import { fetchUserCollectionsByUser } from "../../database/hooks/useUserCollections";
import { fetchCollectionItems } from "../../database/hooks/useCollectionItems";
import { 
  createUserCollectionItem, 
  checkUserHasCollectionItem 
} from "../../database/hooks/useUserCollectionItems";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface CameraScreenProps {}

export default function CameraScreen({}: CameraScreenProps) {
  const posthog = usePostHog();
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission] = Location.useForegroundPermissions();
  const cameraCaptureRef = useRef<CameraCaptureHandle>(null);
  const lastIdentifyPayloadRef = useRef<IdentifyRequest | null>(null);
  const { session } = useAuth();
  const userId = session?.user?.id || null;
  
  // Get user data to initialize default visibility
  const { user } = useUser(userId);

  // Use camera reducer for consolidated state management
  const {
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
  } = useCameraReducer(user?.default_public_captures || false);
  

  // VLM
  const {
    identify,
    tier1, tier2,
    isLoading: idLoading,
    error: idError,
    reset
  } = useIdentify();
  const { uploadPhoto, uploadCapturePhoto } = usePhotoUpload();
  const isRejectedRef = useRef(false);
  
  // Derive permission resolution status - no useState needed
  const permissionsResolved = permission?.status != null;
  
  // Use styled alerts
  
  // Use our new custom hooks
  const { checkCaptureLimit, incrementCaptureCount, syncWithDatabase, trackIdentifyAttempt } = useCaptureLimitsWithPersistence(userId);
  const { showTutorialOverlay, setShowTutorialOverlay, panResponder, handleFirstCapture } = useTutorialFlow(userId);
  const { savedOffline, setSavedOffline, saveOfflineCapture, initializeOfflineService } = useOfflineCapture();
  const { processLassoCapture, processFullScreenCapture } = useCaptureProcessing();
  const { queuePostCaptureModals } = useModalSequence();
  const { enqueueModal, isShowingModal, currentModal } = useModalQueue();
  const { incrementOrCreateItem } = useItems();
  
  // Don't show error in polaroid if we're saving offline
  // Don't pass network errors to polaroid - we handle them differently
  const polaroidError = (vlmCaptureSuccess === true || savedOffline || (idError && idError.message === 'Network request failed')) ? null : idError;
  
  // Create capture handlers using extracted module
  const captureHandlers = createCaptureHandlers({
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
  });

  const handleRetryIdentification = useCallback(() => 
    captureHandlers.handleRetryIdentification(reset), 
    [captureHandlers, reset]
  );


  const handleCapture = useCallback(
    (points: { x: number; y: number }[], cameraRef: React.RefObject<CameraView>) =>
      captureHandlers.handleCapture(points, cameraRef, SCREEN_WIDTH, SCREEN_HEIGHT),
    [captureHandlers]
  );

  const handleFullScreenCapture = useCallback(
    () => captureHandlers.handleFullScreenCapture(SCREEN_WIDTH, SCREEN_HEIGHT),
    [captureHandlers]
  );


  const dismissPolaroid = useCallback(
    async () => {
      await captureHandlers.dismissPolaroid(
        isCapturing,
        capturedUri,
        vlmCaptureSuccess,
        identifiedLabel,
        identificationComplete,
        isRejectedRef.current,
        tier1
      );
      // Reset rejection flag after dismissal
      isRejectedRef.current = false;
    },
    [captureHandlers, isCapturing, capturedUri, vlmCaptureSuccess, identifiedLabel, identificationComplete, tier1]
  );


  return (
    <CameraPermissionHandler
      permission={permission}
      requestPermission={requestPermission}
    >
      <GestureHandlerRootView style={{ flex: 1 }} {...panResponder.panHandlers}>
        <View style={{ flex: 1, backgroundColor: 'black' }}>
          <CameraDebugLogger 
            states={{
              isCapturing,
              capturedUri,
              vlmCaptureSuccess,
              identifiedLabel,
              identificationComplete,
              idLoading,
              idError,
              savedOffline
            }}
          />
          
          <CameraEffects
            dispatch={dispatch}
            actions={actions}
            isCapturing={isCapturing}
            capturedUri={capturedUri}
            captureBox={captureBox}
            location={location}
            rarityTier={rarityTier}
            tier1={tier1}
            tier2={tier2}
            idLoading={idLoading}
            idError={idError}
            userId={userId}
            initializeOfflineService={initializeOfflineService}
            syncWithDatabase={syncWithDatabase}
            saveOfflineCapture={saveOfflineCapture}
            setSavedOffline={setSavedOffline}
            savedOffline={savedOffline}
            locationPermission={locationPermission}
            cameraCaptureRef={cameraCaptureRef}
            isShowingModal={isShowingModal}
            currentModal={currentModal}
          />
          
          <CameraCapture
          ref={cameraCaptureRef}
          onCapture={handleCapture}
          onFullScreenCapture={handleFullScreenCapture}
          isCapturing={isCapturing}
        />
        
        {showTutorialOverlay && (
          <CameraTutorialOverlay visible={showTutorialOverlay} onComplete={() => setShowTutorialOverlay(false)} />
        )}
        
        {capturedUri && (
          <PolaroidDevelopment
            photoUri={capturedUri}
            captureBox={captureBox}
            onDismiss={dismissPolaroid}
            label={identifiedLabel || undefined}
            captureSuccess={vlmCaptureSuccess}
            onRetry={handleRetryIdentification}
            error={polaroidError}
            identificationComplete={identificationComplete}
            isOfflineSave={savedOffline}
            isPublic={isCapturePublic}
            onSetPublic={(value) => dispatch(actions.setPublicStatus(value))}
            isIdentifying={idLoading}
            rarityTier={rarityTier}
            onReject={() => {
              // Mark as rejected so dismissPolaroid won't save it
              isRejectedRef.current = true;
            }}
          />
        )}
        
        {/* Temporary test button for modal failsafe - REMOVE AFTER TESTING */}
        {/* <TestModalFailsafeButton /> */}
      </View>
    </GestureHandlerRootView>
    </CameraPermissionHandler>
  );
}