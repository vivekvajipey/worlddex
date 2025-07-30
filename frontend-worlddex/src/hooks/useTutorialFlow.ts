import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { PanResponder } from 'react-native';
import { useUser, updateUserField } from '../../database/hooks/useUsers';
import { useModalQueue } from '../contexts/ModalQueueContext';

interface UseTutorialFlowReturn {
  showTutorialOverlay: boolean;
  setShowTutorialOverlay: (show: boolean) => void;
  panResponder: any;
  handleFirstCapture: () => Promise<void>;
}

export const useTutorialFlow = (userId: string | null): UseTutorialFlowReturn => {
  const { user } = useUser(userId);
  const { enqueueModal } = useModalQueue();
  
  const [showTutorialOverlay, setShowTutorialOverlay] = useState(false);
  const [idleTimerActive, setIdleTimerActive] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tutorialShownCountRef = useRef(0);

  // Show tutorial overlay for new users
  useEffect(() => {
    if (user && !user.is_onboarded) {
      setShowTutorialOverlay(true);
      setIdleTimerActive(false); // Don't use idle timer for first-time users
    } else if (user && user.is_onboarded) {
      // For returning users, activate idle detection
      setIdleTimerActive(true);
    }
  }, [user]);

  // Idle detection for tutorial nudge
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    
    // Only set new timer if:
    // 1. Idle timer is active (user is onboarded)
    // 2. Tutorial isn't currently showing
    // 3. Haven't shown it too many times
    if (idleTimerActive && !showTutorialOverlay && tutorialShownCountRef.current < 3) {
      idleTimerRef.current = setTimeout(() => {
        setShowTutorialOverlay(true);
        tutorialShownCountRef.current += 1;
      }, 8000); // 8 seconds of inactivity
    }
  }, [idleTimerActive, showTutorialOverlay]);

  // Disable idle timer after first capture
  const disableIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    setIdleTimerActive(false);
  }, []);

  // PanResponder for idle detection - recreated when dependencies change
  const panResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponderCapture: () => {
        // This fires on any touch interaction
        if (showTutorialOverlay && user?.is_onboarded) {
          // Hide tutorial on any interaction if user is already onboarded
          setShowTutorialOverlay(false);
        }
        resetIdleTimer();
        return false; // Important: Don't capture the touch, let it pass through
      },
    }),
    [showTutorialOverlay, user, resetIdleTimer]
  );

  // Set up initial timer when component mounts or dependencies change
  useEffect(() => {
    resetIdleTimer();

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [resetIdleTimer]);

  // Check for progressive onboarding modals (circle and swipe)
  useEffect(() => {
    if (!user || !userId) return;

    // Show circle tutorial modal after 3 captures
    if (user.total_captures && user.total_captures >= 3 && !user.onboarding_circle_shown) {
      enqueueModal({
        type: 'onboardingCircle',
        data: {},
        priority: 80,
        persistent: false
      });
      updateUserField(userId, 'onboarding_circle_shown', true).catch(console.error);
    }

    // Show swipe tutorial modal after 10 captures
    if (user.total_captures && user.total_captures >= 10 && !user.onboarding_swipe_shown) {
      enqueueModal({
        type: 'onboardingSwipe',
        data: {},
        priority: 80,
        persistent: false
      });
      updateUserField(userId, 'onboarding_swipe_shown', true).catch(console.error);
    }
  }, [user, userId, enqueueModal]);

  // Handle first capture completion
  const handleFirstCapture = useCallback(async () => {
    disableIdleTimer();
    
    // Hide tutorial for new users when they make their first capture
    if (showTutorialOverlay && !user?.is_onboarded) {
      setShowTutorialOverlay(false);
    }

    // Mark as onboarded if this is their first capture
    if (userId && showTutorialOverlay) {
      await updateUserField(userId, 'is_onboarded', true);
    }
  }, [disableIdleTimer, showTutorialOverlay, user, userId]);

  return {
    showTutorialOverlay,
    setShowTutorialOverlay,
    panResponder,
    handleFirstCapture
  };
};