import { useCallback } from 'react';
import { useUser } from '../../database/hooks/useUsers';
import { useAlert } from '../contexts/AlertContext';

interface UseCaptureLimitsReturn {
  checkCaptureLimit: () => boolean;
  dailyCapturesUsed: number;
  dailyCaptureLimit: number;
}

export const useCaptureLimits = (userId: string | null): UseCaptureLimitsReturn => {
  const { user } = useUser(userId);
  const { showAlert } = useAlert();

  const dailyCaptureLimit = 10;
  const dailyCapturesUsed = user?.daily_captures_used || 0;

  const checkCaptureLimit = useCallback((): boolean => {
    if (!user) {
      // If no user, allow capture (will fail later with auth check)
      return true;
    }

    // Admins have unlimited captures
    if (user.is_admin) {
      return true;
    }

    if (dailyCapturesUsed >= dailyCaptureLimit) {
      showAlert({
        title: "Daily Limit Reached",
        message: "You have used all 10 daily captures! They will reset at midnight UTC.",
        icon: "timer-outline",
        iconColor: "#EF4444"
      });
      return false;
    }

    return true;
  }, [user, dailyCapturesUsed, dailyCaptureLimit, showAlert]);

  return {
    checkCaptureLimit,
    dailyCapturesUsed,
    dailyCaptureLimit
  };
};