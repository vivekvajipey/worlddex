import React from 'react';
import CoinRewardModal from '../CoinRewardModal';
import LevelUpModal from '../LevelUpModal';
import { LocationPrompt } from '../permissions/LocationPrompt';
import { useModalQueue } from '../../../src/hooks/useModalQueue';

interface ModalCoordinatorProps {
  onLocationEnable?: () => void;
  onLocationSkip?: () => void;
}

export const ModalCoordinator: React.FC<ModalCoordinatorProps> = ({
  onLocationEnable,
  onLocationSkip
}) => {
  const { currentModal, isShowingModal, dismissCurrentModal } = useModalQueue();

  if (!isShowingModal || !currentModal) {
    return null;
  }

  switch (currentModal.type) {
    case 'coinReward':
      return (
        <CoinRewardModal
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
          visible={true}
          onClose={dismissCurrentModal}
          newLevel={currentModal.data.newLevel}
        />
      );

    case 'locationPrompt':
      return (
        <LocationPrompt
          visible={true}
          itemName={currentModal.data.itemName}
          onEnableLocation={() => {
            dismissCurrentModal();
            onLocationEnable?.();
          }}
          onSkip={() => {
            dismissCurrentModal();
            onLocationSkip?.();
          }}
        />
      );

    default:
      console.warn(`Unknown modal type: ${currentModal.type}`);
      return null;
  }
};