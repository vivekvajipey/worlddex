// Example of how to refactor the modal handling in camera.tsx
// This shows the key changes needed

import { useModalQueue } from '../../src/hooks/useModalQueue';

// In the component:
export default function CameraScreen() {
  // ... existing code ...
  
  const { enqueueModal } = useModalQueue();
  
  // Remove individual modal states:
  // const [coinModalVisible, setCoinModalVisible] = useState(false);
  // const [levelUpModalVisible, setLevelUpModalVisible] = useState(false);
  // const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  
  // In handleDismissPreview, replace all the modal logic with:
  const handleDismissPreview = useCallback(async () => {
    // ... existing capture logic ...
    
    if (captureSuccess) {
      // Queue modals instead of using timeouts
      
      // 1. Level up modal (highest priority)
      if (xpData?.levelUp && xpData?.newLevel) {
        enqueueModal({
          type: 'levelUp',
          data: { newLevel: xpData.newLevel },
          priority: 100,
          persistent: false
        });
      }
      
      // 2. Coin/XP reward modal (medium priority)
      if (coinsAwarded > 0 || xpData) {
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
          persistent: false
        });
      }
      
      // 3. Location prompt (lowest priority, persistent)
      if (locationPermission && !locationPermission.granted && locationPermission.status === 'undetermined') {
        enqueueModal({
          type: 'locationPrompt',
          data: { itemName: identifiedLabel },
          priority: 10,
          persistent: true // Survives navigation!
        });
      }
    }
    
    // ... rest of cleanup ...
  }, [/* dependencies */]);
  
  // Remove all individual modal components from render
  // Add single ModalCoordinator
  return (
    <View>
      {/* ... camera UI ... */}
      
      <ModalCoordinator
        onLocationEnable={handleEnableLocation}
        onLocationSkip={handleSkipLocation}
      />
    </View>
  );
}