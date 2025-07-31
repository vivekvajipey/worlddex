import React, { useState, useRef } from 'react';
import { View } from 'react-native';
import { useModalQueue } from '../../src/contexts/ModalQueueContext';

interface BackgroundTouchDetectorProps {
  children: React.ReactNode;
}

export const BackgroundTouchDetector: React.FC<BackgroundTouchDetectorProps> = ({ children }) => {
  const { isShowingModal, reportBackgroundTouch } = useModalQueue();
  const [touchCount, setTouchCount] = useState(0);
  const lastTouchRef = useRef<number>(0);

  const handleBackgroundTouch = () => {
    const now = Date.now();
    
    // Reset count if more than 1 second since last touch
    if (now - lastTouchRef.current > 1000) {
      setTouchCount(0);
    }
    
    lastTouchRef.current = now;
    
    if (isShowingModal) {
      setTouchCount(prev => {
        const newCount = prev + 1;
        console.log(`[BackgroundTouch] Touch ${newCount} detected while modal showing`);
        
        if (newCount >= 2) {
          // Second touch means immediate recovery
          reportBackgroundTouch();
          return 0;
        }
        return newCount;
      });
    }
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
          onStartShouldSetResponder={() => {
            handleBackgroundTouch();
            return false; // Don't capture the touch, let it pass through
          }}
        />
      )}
      
      {children}
    </View>
  );
};