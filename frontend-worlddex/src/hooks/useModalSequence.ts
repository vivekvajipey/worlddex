import { useCallback } from 'react';
import * as Location from 'expo-location';
import { useModalQueue } from '../contexts/ModalQueueContext';
import { calculateAndAwardCoins } from '../../database/hooks/useCoins';
import { calculateAndAwardCaptureXP } from '../../database/hooks/useXP';

interface XPData {
  total: number;
  rewards: any[];
  levelUp?: boolean;
  newLevel?: number;
}

interface UseModalSequenceReturn {
  queuePostCaptureModals: (params: {
    userId: string;
    captureId: string;
    itemName: string;
    rarityTier: string;
    xpValue?: number;
    isGlobalFirst?: boolean;
  }) => Promise<void>;
}

export const useModalSequence = (): UseModalSequenceReturn => {
  const { enqueueModal } = useModalQueue();

  const queuePostCaptureModals = useCallback(async ({
    userId,
    captureId,
    itemName,
    rarityTier,
    xpValue,
    isGlobalFirst = false
  }: {
    userId: string;
    captureId: string;
    itemName: string;
    rarityTier: string;
    xpValue?: number;
    isGlobalFirst?: boolean;
  }) => {
    // console.log("=== QUEUEING POST-CAPTURE MODALS ===");

    let xpData: XPData | null = null;

    // Calculate and award XP
    // console.log("[ModalSequence] Calculating XP for capture:", { userId, captureId, itemName, rarityTier, xpValue, isGlobalFirst });
    const xpResult = await calculateAndAwardCaptureXP(
      userId,
      captureId,
      itemName,
      rarityTier as any, // Type assertion needed for rarity tier
      xpValue,
      isGlobalFirst
    );
    console.log("[ModalSequence] XP calculation result:", xpResult);
    
    if (xpResult.total > 0) {
      xpData = xpResult;
    }

    // Calculate and award coins
    console.log("[ModalSequence] Calculating coins for user:", userId);
    const { total: coinsAwarded, rewards } = await calculateAndAwardCoins(userId);
    console.log("[ModalSequence] Coin calculation result:", { coinsAwarded, rewards });

    // 1. Level up modal (highest priority)
    if (xpData?.levelUp && xpData?.newLevel) {
      console.log("Queueing level up modal");
      enqueueModal({
        type: 'levelUp',
        data: { newLevel: xpData.newLevel },
        priority: 100,
        persistent: true
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
        persistent: true
      });
    } else {
      console.log("[ModalSequence] NOT queueing coin reward modal - no rewards to show", {
        coinsAwarded,
        hasXpData: !!xpData,
        xpTotal: xpData?.total || 0
      });
    }

    // 3. Location prompt (lowest priority, persistent)
    // Get fresh permission status to avoid stale state
    const currentLocationPermission = await Location.getForegroundPermissionsAsync();
    if (!currentLocationPermission.granted && currentLocationPermission.status === 'undetermined') {
      console.log("Queueing location prompt (persistent)");
      enqueueModal({
        type: 'locationPrompt',
        data: { itemName },
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
  }, [enqueueModal]);

  return {
    queuePostCaptureModals
  };
};