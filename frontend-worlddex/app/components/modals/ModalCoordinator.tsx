import React from 'react';
import CoinRewardModal from '../CoinRewardModal';
import LevelUpModal from '../LevelUpModal';
import { LocationPrompt } from '../permissions/LocationPrompt';
import OnboardingCircleModal from '../OnboardingCircleModal';
import OnboardingSwipeModal from '../OnboardingSwipeModal';
import { useModalQueue } from '../../../src/contexts/ModalQueueContext';
import { usePathname, useRouter } from 'expo-router';
import * as Location from 'expo-location';

export const ModalCoordinator: React.FC = () => {
  const { currentModal, isShowingModal, dismissCurrentModal } = useModalQueue();
  const pathname = usePathname();
  const router = useRouter();
  
  // Location handlers - only used when on camera screen
  const handleLocationEnable = React.useCallback(async () => {
    console.log("=== USER ENABLING LOCATION (from coordinator) ===");
    
    const { status } = await Location.requestForegroundPermissionsAsync();
    console.log("Location permission result:", status);
    
    if (status === 'granted') {
      // Get location for future captures
      try {
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        
        console.log("Location obtained:", currentLocation.coords);
        
        console.log("Location enabled successfully - future captures will include location");
      } catch (error) {
        console.error("Error getting location after permission:", error);
      }
    }
    
    dismissCurrentModal();
  }, [dismissCurrentModal]);
  
  const handleLocationSkip = React.useCallback(() => {
    console.log("=== USER SKIPPED LOCATION (from coordinator) ===");
    dismissCurrentModal();
  }, [dismissCurrentModal]);

  console.log("=== MODAL COORDINATOR ===");
  console.log("isShowingModal:", isShowingModal);
  console.log("currentModal type:", currentModal?.type);
  console.log("currentModal id:", currentModal?.id);
  console.log("pathname:", pathname);

  if (!isShowingModal || !currentModal) {
    return null;
  }

  switch (currentModal.type) {
    case 'coinReward':
      return (
        <CoinRewardModal
          key={currentModal.id}
          visible={true}
          onClose={dismissCurrentModal}
          total={currentModal.data.total}
          rewards={currentModal.data.rewards}
          xpTotal={currentModal.data.xpTotal}
          xpRewards={currentModal.data.xpRewards}
          levelUp={currentModal.data.levelUp}
          newLevel={currentModal.data.newLevel}
        />
      );

    case 'levelUp':
      return (
        <LevelUpModal
          key={currentModal.id}
          visible={true}
          onClose={dismissCurrentModal}
          newLevel={currentModal.data.newLevel}
        />
      );

    case 'locationPrompt':
      return (
        <LocationPrompt
          key={currentModal.id}
          visible={true}
          itemName={currentModal.data.itemName}
          onEnableLocation={handleLocationEnable}
          onSkip={handleLocationSkip}
        />
      );

    case 'onboardingCircle':
      return (
        <OnboardingCircleModal
          key={currentModal.id}
          visible={true}
          onClose={dismissCurrentModal}
        />
      );

    case 'onboardingSwipe':
      return (
        <OnboardingSwipeModal
          key={currentModal.id}
          visible={true}
          onClose={dismissCurrentModal}
        />
      );

    default:
      console.warn(`Unknown modal type: ${currentModal.type}`);
      return null;
  }
};