import React from 'react';
import { View } from 'react-native';
import { useModalQueue } from '../../src/contexts/ModalQueueContext';

interface BackgroundTouchDetectorProps {
  children: React.ReactNode;
}

export const BackgroundTouchDetector: React.FC<BackgroundTouchDetectorProps> = ({ children }) => {
  const { isShowingModal, reportBackgroundTouch } = useModalQueue();

  const handleBackgroundTouch = () => {
    if (isShowingModal) {
      // This touch should have been blocked by a modal - immediate recovery
      console.error('[BackgroundTouch] CRITICAL: Touch detected with modal showing - immediate dismissal!');
      reportBackgroundTouch();
      return true; // Capture this touch to prevent propagation
    }
    return false;
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Background touch detector - only active when modal should be showing */}
      {isShowingModal && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1, // Low z-index, should be behind everything
          }}
          onStartShouldSetResponder={handleBackgroundTouch}
        />
      )}
      
      {children}
    </View>
  );
};