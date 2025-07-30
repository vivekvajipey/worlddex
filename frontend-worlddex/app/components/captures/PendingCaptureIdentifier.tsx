import React, { useState, useCallback, useRef, useEffect } from "react";
import { View, Modal, ActivityIndicator, Text, TouchableOpacity } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import { useIdentify } from "../../../src/hooks/useIdentify";
import { useImageProcessor } from "../../../src/hooks/useImageProcessor";
import { OfflineCaptureService, PendingCapture } from "../../../src/services/offlineCaptureService";
import PolaroidDevelopment from "../camera/PolaroidDevelopment";
import { useAuth } from "../../../src/contexts/AuthContext";
import { usePhotoUpload } from "../../../src/hooks/usePhotoUpload";
import { useItems } from "../../../database/hooks/useItems";
import { incrementUserField } from "../../../database/hooks/useUsers";
import { useUser } from "../../../database/hooks/useUsers";
import { calculateAndAwardCoins } from "../../../database/hooks/useCoins";
import { calculateAndAwardCaptureXP } from "../../../database/hooks/useXP";
import { fetchCollectionItems } from "../../../database/hooks/useCollectionItems";
import { createUserCollectionItem, checkUserHasCollectionItem } from "../../../database/hooks/useUserCollectionItems";
import { fetchUserCollectionsByUser } from "../../../database/hooks/useUserCollections";
import type { Capture, CollectionItem } from "../../../database/types";
import { IdentifyRequest } from "../../../../shared/types/identify";
import { usePostHog } from "posthog-react-native";
import { useModalQueue } from "../../../src/contexts/ModalQueueContext";
import { useAlert } from "../../../src/contexts/AlertContext";

interface PendingCaptureIdentifierProps {
  pendingCapture: PendingCapture | null;
  onClose: () => void;
  onSuccess: () => void;
  onCoinReward?: (data: { 
    total: number; 
    rewards: { amount: number; reason: string }[];
    xpTotal?: number;
    xpRewards?: { amount: number; reason: string }[];
    levelUp?: boolean;
    newLevel?: number;
  }) => void;
  onLevelUp?: (newLevel: number) => void;
}

export default function PendingCaptureIdentifier({ 
  pendingCapture, 
  onClose, 
  onSuccess,
  onCoinReward,
  onLevelUp
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
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [vlmCaptureSuccess, setVlmCaptureSuccess] = useState<boolean | null>(null);
  const [identifiedLabel, setIdentifiedLabel] = useState<string | null>(null);
  const [identificationComplete, setIdentificationComplete] = useState(false);
  const [rarityTier, setRarityTier] = useState<"common" | "uncommon" | "rare" | "epic" | "mythic" | "legendary">("common");
  const [rarityScore, setRarityScore] = useState<number | undefined>(undefined);
  const [isCapturePublic, setIsCapturePublic] = useState(true);
  const isRejectedRef = useRef(false);
  const lastIdentifyPayloadRef = useRef<IdentifyRequest | null>(null);

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
      // Show alert for network or processing errors
      showAlert({
        title: "Identification Failed",
        message: error instanceof Error && error.message === 'Network request failed' 
          ? "No internet connection. Please check your connection and try again."
          : "Failed to identify capture. Please try again.",
        icon: "wifi-off",
        iconColor: "#EF4444"
      });
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

  const handleDismissPreview = useCallback(async () => {
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
        const label = identifiedLabel;
        const { item, isGlobalFirst } = await incrementOrCreateItem(label);
        
        if (!item) {
          console.error("Critical: No matching item found or created for label:", label);
          showAlert({
            title: "Error",
            message: "Failed to process capture. Please try again.",
            icon: "alert-circle-outline",
            iconColor: "#EF4444"
          });
          onClose();
          return;
        }
        
        // Create the capture record
        const capturePayload: Omit<Capture, "id" | "captured_at" | "segmented_image_key"> = {
          user_id: session.user.id,
          item_id: item.id,
          item_name: item.name,
          capture_number: item.total_captures,
          image_key: "", // Will be set by uploadCapturePhoto
          is_public: isCapturePublic,
          like_count: 0,
          daily_upvotes: 0,
          rarity_tier: rarityTier,
          rarity_score: rarityScore,
          // Don't include location in the payload - it's causing PostGIS errors
          // location: pendingCapture.location
        };
        
        const captureRecord = await uploadCapturePhoto(
          pendingCapture.imageUri,
          "image/jpeg",
          `${Date.now()}.jpg`,
          capturePayload
        );
        
        // Auto-add to user collections
        if (captureRecord && identifiedLabel) {
          try {
            const userCollections = await fetchUserCollectionsByUser(session.user.id);
            
            for (const userCollection of userCollections) {
              const collectionItems = await fetchCollectionItems(userCollection.collection_id);
              const matchingItems = collectionItems.filter((ci: CollectionItem) => {
                const itemNameMatch = ci.name?.toLowerCase() === identifiedLabel.toLowerCase();
                const displayNameMatch = ci.display_name?.toLowerCase() === identifiedLabel.toLowerCase();
                return itemNameMatch || displayNameMatch;
              });
              
              for (const collectionItem of matchingItems) {
                const hasItem = await checkUserHasCollectionItem(session.user.id, collectionItem.id);
                
                if (!hasItem) {
                  await createUserCollectionItem({
                    user_id: session.user.id,
                    collection_item_id: collectionItem.id,
                    capture_id: captureRecord.id,
                    collection_id: collectionItem.collection_id,
                  });
                }
              }
            }
          } catch (collectionErr) {
            console.error("Error handling collections:", collectionErr);
          }
        }
        
        // Increment daily captures used
        await incrementUserField(session.user.id, "daily_captures_used", 1);
        
        // Calculate and award XP
        let xpData = null;
        if (captureRecord && item && rarityTier) {
          const xpResult = await calculateAndAwardCaptureXP(
            session.user.id,
            captureRecord.id,
            item.name,
            rarityTier,
            (tier1 as any)?.xpValue,
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
            item_name: item.name,
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
      // Either rejected or failed - update status and close
      if (isRejectedRef.current || vlmCaptureSuccess === false) {
        await OfflineCaptureService.updateCaptureStatus(
          pendingCapture.id, 
          'failed',
          session.user.id,
          isRejectedRef.current ? 'User rejected' : 'Identification failed'
        );
      }
    }
    
    // Reset states and close (for error/rejection cases)
    reset();
    onClose();
  }, [
    pendingCapture,
    session,
    identificationComplete,
    vlmCaptureSuccess,
    identifiedLabel,
    incrementOrCreateItem,
    isCapturePublic,
    rarityTier,
    rarityScore,
    uploadCapturePhoto,
    reset,
    onClose,
    onSuccess,
    onCoinReward,
    onLevelUp,
    posthog,
    tier1
  ]);

  const polaroidError = vlmCaptureSuccess === true ? null : idError;

  if (!pendingCapture) return null;

  return (
    <Modal
      visible={true}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black">
        {isProcessing && !idLoading && !identificationComplete ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#FFF" />
            <Text className="text-white mt-4 font-lexend-medium">Processing image...</Text>
          </View>
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
            onSetPublic={setIsCapturePublic}
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