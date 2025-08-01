import React, { useState, useCallback, useRef, useEffect } from "react";
import { View, Modal, ActivityIndicator, Text } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import { useIdentify } from "../../../src/hooks/useIdentify";
import { useImageProcessor } from "../../../src/hooks/useImageProcessor";
import { OfflineCaptureService, PendingCapture } from "../../../src/services/offlineCaptureService";
import PolaroidDevelopment from "../camera/PolaroidDevelopment";
import { useAuth } from "../../../src/contexts/AuthContext";
import { usePhotoUpload } from "../../../src/hooks/usePhotoUpload";
import { useItems } from "../../../database/hooks/useItems";
import { incrementUserField, useUser, fetchUser } from "../../../database/hooks/useUsers";
import { calculateAndAwardCoins } from "../../../database/hooks/useCoins";
import { calculateAndAwardCaptureXP } from "../../../database/hooks/useXP";
import { fetchCollectionItems } from "../../../database/hooks/useCollectionItems";
import { createUserCollectionItem, checkUserHasCollectionItem } from "../../../database/hooks/useUserCollectionItems";
import { fetchUserCollectionsByUser } from "../../../database/hooks/useUserCollections";
import { IdentifyRequest } from "../../../../shared/types/identify";
import { usePostHog } from "posthog-react-native";
import { useModalQueue } from "../../../src/contexts/ModalQueueContext";
import { useAlert } from "../../../src/contexts/AlertContext";
import { processCaptureAfterIdentification } from "../../../src/services/captureProcessingService";
import { LoadingBackground } from "../LoadingBackground";
import { useLoadingVariant } from "../../../src/hooks/useLoadingVariant";

interface PendingCaptureIdentifierProps {
  pendingCapture: PendingCapture | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PendingCaptureIdentifier({ 
  pendingCapture, 
  onClose, 
  onSuccess
}: PendingCaptureIdentifierProps) {
  const posthog = usePostHog();
  const { enqueueModal } = useModalQueue();
  const { showAlert } = useAlert();
  const { processImageForVLM } = useImageProcessor();
  const { identify, tier1, tier2, isLoading: idLoading, error: idError, reset } = useIdentify();
  const { uploadCapturePhoto, isUploading: isUploadingPhoto, error: uploadError } = usePhotoUpload();
  const { session } = useAuth();
  const { user } = useUser(session?.user?.id || null);
  const { items, incrementOrCreateItem } = useItems();
  const loadingVariant = useLoadingVariant();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [vlmCaptureSuccess, setVlmCaptureSuccess] = useState<boolean | null>(null);
  const [identifiedLabel, setIdentifiedLabel] = useState<string | null>(null);
  const [identificationComplete, setIdentificationComplete] = useState(false);
  const [rarityTier, setRarityTier] = useState<"common" | "uncommon" | "rare" | "epic" | "mythic" | "legendary">("common");
  const [rarityScore, setRarityScore] = useState<number | undefined>(undefined);
  const isRejectedRef = useRef(false);
  const lastIdentifyPayloadRef = useRef<IdentifyRequest | null>(null);
  const userPreferencePromiseRef = useRef<Promise<any> | null>(null);

  // Start identification when pendingCapture is set
  useEffect(() => {
    if (pendingCapture && !isProcessing) {
      startIdentification();
    }
  }, [pendingCapture]);

  // Watch for tier1/tier2 results
  useEffect(() => {
    if (!tier1 && !tier2) {
      setVlmCaptureSuccess(null);
      setIdentifiedLabel(null);
      setIdentificationComplete(false);
      setRarityTier("common");
      setRarityScore(undefined);
      return;
    }

    if (tier1 !== null) {
      if (tier1.label) {
        setVlmCaptureSuccess(true);
        setIdentifiedLabel(tier1.label);
        
        if (tier1.rarityTier) {
          setRarityTier(tier1.rarityTier);
        }
        
        if (tier1.rarityScore !== undefined) {
          setRarityScore(tier1.rarityScore);
        }
        
        if (!idLoading) {
          setIdentificationComplete(true);
        }
      } else {
        setVlmCaptureSuccess(false);
        setIdentificationComplete(true);
      }
    }

    if (tier1 && !idLoading) {
      setIdentificationComplete(true);
      
      if (tier2 && tier2.label) {
        setVlmCaptureSuccess(true);
        setIdentifiedLabel(tier2.label);
      }
    }
  }, [tier1, tier2, idLoading]);

  useEffect(() => {
    if (idError) {
      // Always set vlmCaptureSuccess to false on error to trigger break animation
      setVlmCaptureSuccess(false);
      setIdentificationComplete(true);
    }
  }, [idError]);

  const startIdentification = async () => {
    if (!pendingCapture) return;
    
    setIsProcessing(true);
    setVlmCaptureSuccess(null);
    setIdentifiedLabel(null);
    setIdentificationComplete(false);
    
    // Start fetching user preference in parallel (non-blocking)
    if (session?.user?.id) {
      userPreferencePromiseRef.current = fetchUser(session.user.id).catch((err) => {
        console.warn('[PendingCaptureIdentifier] Failed to fetch user preference:', err);
        return null;
      });
    }
    
    try {
      // Check if image file exists before processing
      const fileInfo = await FileSystem.getInfoAsync(pendingCapture.imageUri);
      
      if (!fileInfo.exists) {
        throw new Error("Image file no longer exists. This capture may be from a previous session.");
      }
      
      // Update pending capture status
      if (!session?.user?.id) {
        throw new Error("No user session available");
      }
      await OfflineCaptureService.updateCaptureStatus(pendingCapture.id, 'identifying', session.user.id);
      
      // Get image info for processing
      const imageInfo = await ImageManipulator.manipulateAsync(
        pendingCapture.imageUri,
        [],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );
      
      // Process image for VLM
      const vlmImage = await processImageForVLM(
        pendingCapture.imageUri, 
        imageInfo.width, 
        imageInfo.height
      );
      
      if (!vlmImage || !vlmImage.base64) {
        throw new Error("Failed to process image for identification");
      }
      
      // Prepare GPS data
      const gpsData = pendingCapture.location ? {
        lat: pendingCapture.location.latitude,
        lng: pendingCapture.location.longitude
      } : null;
      
      lastIdentifyPayloadRef.current = {
        base64Data: vlmImage.base64,
        contentType: "image/jpeg",
        gps: gpsData,
      };
      
      // Start identification - don't wait for processing to complete before showing polaroid
      setIsProcessing(false); // Show polaroid immediately for optimistic UI
      
      await identify({
        base64Data: vlmImage.base64,
        contentType: "image/jpeg",
        gps: gpsData
      });
      
    } catch (error) {
      console.error("Failed to start identification:", error);
      setVlmCaptureSuccess(false);
      setIdentificationComplete(true);
      if (session?.user?.id) {
        await OfflineCaptureService.updateCaptureStatus(
          pendingCapture.id, 
          'failed', 
          session.user.id,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
      // Don't show alert here - let the polaroid break animation play first
      // The alert will be shown in handleDismissPreview after the animation
    }
  };

  const handleRetryIdentification = useCallback(async () => {
    if (!lastIdentifyPayloadRef.current) return;
    
    reset();
    setVlmCaptureSuccess(null);
    setIdentifiedLabel(null);
    setIdentificationComplete(false);
    isRejectedRef.current = false;
    
    try {
      await identify(lastIdentifyPayloadRef.current);
    } catch (err) {
      console.error("Retry identify failed:", err);
      setVlmCaptureSuccess(false);
      setIdentificationComplete(true);
    }
  }, [identify, reset]);

  // Helper function to show Keep/Delete alert
  const showKeepDeleteAlert = useCallback((reason: string, message: string) => {
    setTimeout(() => {
      showAlert({
        title: reason === "user_rejected" ? "Keep or Delete?" : "No Object Detected",
        message,
        icon: reason === "user_rejected" ? "trash-outline" : "help-circle-outline",
        iconColor: reason === "user_rejected" ? "#EF4444" : "#F59E0B",
        buttons: [
          {
            text: "Keep",
            style: "default",
            onPress: async () => {
              if (reason === "user_rejected") {
                // Just close - capture stays as pending
                if (posthog) {
                  posthog.capture("pending_capture_kept_after_rejection");
                }
              } else {
                // Update status for failed identification
                await OfflineCaptureService.updateCaptureStatus(
                  pendingCapture!.id, 
                  'failed',
                  session!.user.id,
                  'No object detected - kept by user'
                );
                if (posthog) {
                  posthog.capture("pending_capture_kept_after_failure", {
                    reason: "no_object_detected"
                  });
                }
              }
            }
          },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              try {
                await OfflineCaptureService.deletePendingCapture(pendingCapture!.id, session!.user.id);
                onSuccess(); // Refresh the list
                if (posthog) {
                  posthog.capture("pending_capture_deleted", {
                    reason: reason === "user_rejected" ? "user_rejected_after_identification" : "no_object_detected"
                  });
                }
              } catch (error) {
                console.error("Failed to delete pending capture:", error);
              }
            }
          }
        ]
      });
    }, 300); // Give modal time to close
  }, [pendingCapture, session, showAlert, onSuccess, posthog]);

  const handleDismissPreview = useCallback(async (isPublic?: boolean) => {
    if (!pendingCapture || !session) {
      onClose();
      return;
    }
    
    // Only proceed if identification was successful and not rejected
    if (
      identificationComplete &&
      vlmCaptureSuccess === true &&
      identifiedLabel &&
      !isRejectedRef.current
    ) {
      try {
        // Use the isPublic value passed from PolaroidDevelopment if available, otherwise use user preference
        let finalIsPublic = isPublic;
        if (finalIsPublic === undefined) {
          const userData = userPreferencePromiseRef.current ? await userPreferencePromiseRef.current : null;
          finalIsPublic = userData?.default_public_captures || false;
        }
        console.log('[PendingCaptureIdentifier] Processing capture with visibility:', finalIsPublic ? 'PUBLIC' : 'PRIVATE', isPublic !== undefined ? '(from capture toggle)' : '(from user preference)');
        
        // Use the shared service to process the capture
        const result = await processCaptureAfterIdentification({
          userId: session.user.id,
          identifiedLabel,
          capturedUri: pendingCapture.imageUri,
          isCapturePublic: finalIsPublic,
          rarityTier,
          rarityScore,
          tier1Response: tier1,
          originalCapturedAt: pendingCapture.capturedAt, // Pass the original timestamp!
          enableTemporaryCapture: true, // Enable for immediate display in WorldDex
          services: {
            incrementOrCreateItem,
            uploadCapturePhoto: (uri: string, type: string, filename: string, payload: any, capturedAt?: string) => 
              uploadCapturePhoto(uri, type, filename, payload, capturedAt), // Pass through the timestamp
            incrementCaptureCount: async () => {
              // Increment the count - this capture is now being added to the collection
              await incrementUserField(session.user.id, "daily_captures_used", 1);
              console.log('[PendingCapture] Incremented capture count for offline capture');
            },
            fetchUserCollectionsByUser,
            fetchCollectionItems,
            checkUserHasCollectionItem,
            createUserCollectionItem
          },
          onProgress: (status) => console.log(`[PendingCapture] ${status}`)
        });

        if (!result.success) {
          console.error("[PendingCapture] Failed to process capture:", result.error);
          showAlert({
            title: "Error",
            message: result.error || "Failed to process capture. Please try again.",
            icon: "alert-circle-outline",
            iconColor: "#EF4444"
          });
          onClose();
          return;
        }

        const captureRecord = result.captureRecord;
        const isGlobalFirst = result.isGlobalFirst || false;
        
        // Calculate and award XP
        let xpData = null;
        if (captureRecord && rarityTier) {
          const xpResult = await calculateAndAwardCaptureXP(
            session.user.id,
            captureRecord.id,
            identifiedLabel,
            rarityTier,
            result.xpAwarded,
            isGlobalFirst
          );
          if (xpResult.total > 0) {
            xpData = xpResult;
          }
        }
        
        // Calculate and award coins
        const { total: coinsAwarded, rewards } = await calculateAndAwardCoins(session.user.id);
        
        // Handle level up - queue modal to show when back on camera
        if (xpData?.levelUp && xpData?.newLevel) {
          enqueueModal({
            type: 'levelUp',
            data: { newLevel: xpData.newLevel },
            priority: 100,
            persistent: true
          });
        }
        
        // Handle coin/XP rewards - queue modal to show when back on camera
        if (coinsAwarded > 0 || (xpData?.total && xpData.total > 0)) {
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
            priority: 90,
            persistent: true
          });
        }
        
        // Delete the pending capture
        await OfflineCaptureService.deletePendingCapture(pendingCapture.id, session.user.id);
        
        // Track successful identification
        if (posthog) {
          posthog.capture("pending_capture_identified", {
            item_name: identifiedLabel,
            rarity_tier: rarityTier,
            had_location: !!pendingCapture.location
          });
        }
        
        // Call onSuccess first
        onSuccess();
        
        // Always close the modal after success
        reset();
        onClose();
        return;
      } catch (err) {
        console.error("Error during capture processing:", err);
        showAlert({
          title: "Error",
          message: "Failed to save capture. Please try again.",
          icon: "alert-circle-outline",
          iconColor: "#EF4444"
        });
      }
    } else {
      // Either rejected, failed, or network error
      if (isRejectedRef.current) {
        // Close the modal first
        reset();
        onClose();
        
        // Show Keep/Delete alert
        showKeepDeleteAlert(
          "user_rejected",
          "Do you want to remove this capture from your pending list?"
        );
        return;
      } else if (vlmCaptureSuccess === false) {
        // Identification failed - determine the type of failure
        reset();
        onClose();
        
        if (idError && idError.message === 'Network request failed') {
          // Network error - show connection alert after break animation
          setTimeout(() => {
            showAlert({
              title: "No Connection",
              message: "Unable to reach the server. Please check your internet connection and try again.",
              icon: "wifi-outline",
              iconColor: "#EF4444"
            });
          }, 300); // Give modal time to close
        } else {
          // No object detected - show Keep/Delete alert
          showKeepDeleteAlert(
            "no_object_detected",
            "We couldn't identify an object in this capture. Would you like to keep it for later or remove it?"
          );
        }
      }
    }
  }, [
    pendingCapture,
    session,
    identificationComplete,
    vlmCaptureSuccess,
    identifiedLabel,
    incrementOrCreateItem,
    rarityTier,
    rarityScore,
    uploadCapturePhoto,
    reset,
    onClose,
    onSuccess,
    posthog,
    tier1,
    showKeepDeleteAlert
  ]);

  // Show error in polaroid to trigger break animation for all failures
  const polaroidError = vlmCaptureSuccess === true ? null : idError;

  if (!pendingCapture) return null;

  return (
    <Modal
      visible={true}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1">
        {isProcessing && !idLoading && !identificationComplete ? (
          <LoadingBackground 
            message="Processing your capture..."
            showSpinner={true}
            variant={loadingVariant}
          />
        ) : (
          <PolaroidDevelopment
            photoUri={pendingCapture.imageUri}
            captureBox={pendingCapture.captureBox || {
              x: 50,
              y: 100,
              width: 300,
              height: 300,
              aspectRatio: 1
            }}
            onDismiss={handleDismissPreview}
            captureSuccess={vlmCaptureSuccess}
            isIdentifying={idLoading}
            label={identifiedLabel ?? ""}
            onReject={() => {
              isRejectedRef.current = true;
            }}
            identificationComplete={identificationComplete}
            rarityTier={rarityTier}
            error={polaroidError}
            onRetry={handleRetryIdentification}
          />
        )}
      </View>
      
    </Modal>
  );
}