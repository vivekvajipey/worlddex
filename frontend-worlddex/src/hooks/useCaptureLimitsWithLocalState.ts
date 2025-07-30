import { useCallback, useState, useEffect } from 'react';
import { useUser } from '../../database/hooks/useUsers';
import { useAlert } from '../contexts/AlertContext';
import { incrementUserField } from '../../database/hooks/useUsers';

interface UseCaptureLimitsReturn {
  checkCaptureLimit: () => boolean;
  dailyCapturesUsed: number;
  dailyCaptureLimit: number;
  incrementCaptureCount: () => Promise<void>;
  resetLocalCount: () => void;
}

export const useCaptureLimitsWithLocalState = (userId: string | null): UseCaptureLimitsReturn => {
  const { user } = useUser(userId);
  const { showAlert } = useAlert();
  
  // Local state for immediate updates
  const [localCapturesUsed, setLocalCapturesUsed] = useState<number>(0);
  
  const dailyCaptureLimit = 10;
  
  // Sync local state with database value when user data loads/changes
  useEffect(() => {
    if (user?.daily_captures_used !== undefined) {
      setLocalCapturesUsed(user.daily_captures_used);
    }
  }, [user?.daily_captures_used]);
  
  const checkCaptureLimit = useCallback((): boolean => {
    if (!user) {
      // If no user, allow capture (will fail later with auth check)
      return true;
    }
    
    // Use local state for immediate checking
    if (localCapturesUsed >= dailyCaptureLimit) {
      showAlert({
        title: "Daily Limit Reached",
        message: `You have used all ${dailyCaptureLimit} daily captures! They will reset at midnight PST.`,
        icon: "timer-outline",
        iconColor: "#EF4444"
      });
      return false;
    }
    
    return true;
  }, [user, localCapturesUsed, dailyCaptureLimit, showAlert]);
  
  const incrementCaptureCount = useCallback(async (): Promise<void> => {
    if (!userId) return;
    
    // Immediately update local state
    setLocalCapturesUsed(prev => prev + 1);
    
    // Update database in background
    try {
      await incrementUserField(userId, "daily_captures_used", 1);
      await incrementUserField(userId, "total_captures", 1);
    } catch (error) {
      console.error('Failed to update capture count in database:', error);
      // Rollback local state if database update fails
      setLocalCapturesUsed(prev => prev - 1);
      throw error;
    }
  }, [userId]);
  
  // Reset local count (useful for testing or when day resets)
  const resetLocalCount = useCallback(() => {
    setLocalCapturesUsed(0);
  }, []);
  
  return {
    checkCaptureLimit,
    dailyCapturesUsed: localCapturesUsed,
    dailyCaptureLimit,
    incrementCaptureCount,
    resetLocalCount
  };
};