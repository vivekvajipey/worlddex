import { useCallback, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../../database/hooks/useUsers';
import { useAlert } from '../contexts/AlertContext';
import { incrementUserField } from '../../database/hooks/useUsers';

interface UseCaptureLimitsReturn {
  checkCaptureLimit: () => boolean;
  dailyCapturesUsed: number;
  dailyCaptureLimit: number;
  incrementCaptureCount: () => Promise<void>;
  syncWithDatabase: () => Promise<void>;
}

const CAPTURE_COUNT_KEY = '@capture_count_local';
const CAPTURE_COUNT_DATE_KEY = '@capture_count_date';
const PENDING_SYNC_KEY = '@capture_count_pending_sync';

export const useCaptureLimitsWithPersistence = (userId: string | null): UseCaptureLimitsReturn => {
  const { user } = useUser(userId);
  const { showAlert } = useAlert();
  
  // Local state for immediate updates
  const [localCapturesUsed, setLocalCapturesUsed] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const dailyCaptureLimit = 10;
  
  // Initialize from AsyncStorage and sync with database
  useEffect(() => {
    if (!userId) return;
    
    const initializeCaptureCounts = async () => {
      try {
        // Check if we need to reset daily count (new day)
        const storedDate = await AsyncStorage.getItem(CAPTURE_COUNT_DATE_KEY);
        const today = new Date().toDateString();
        
        if (storedDate !== today) {
          // New day - reset local count
          await AsyncStorage.setItem(CAPTURE_COUNT_KEY, '0');
          await AsyncStorage.setItem(CAPTURE_COUNT_DATE_KEY, today);
          await AsyncStorage.removeItem(PENDING_SYNC_KEY);
          setLocalCapturesUsed(0);
        } else {
          // Same day - load stored count
          const storedCount = await AsyncStorage.getItem(CAPTURE_COUNT_KEY);
          const localCount = storedCount ? parseInt(storedCount, 10) : 0;
          
          // Use the higher value between local and database
          const dbCount = user?.daily_captures_used || 0;
          const actualCount = Math.max(localCount, dbCount);
          
          setLocalCapturesUsed(actualCount);
          await AsyncStorage.setItem(CAPTURE_COUNT_KEY, actualCount.toString());
        }
        
        // Sync any pending increments
        await syncPendingIncrements();
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize capture counts:', error);
        // Fallback to database value
        setLocalCapturesUsed(user?.daily_captures_used || 0);
        setIsInitialized(true);
      }
    };
    
    initializeCaptureCounts();
  }, [userId, user?.daily_captures_used]);
  
  const syncPendingIncrements = async () => {
    if (!userId) return;
    
    try {
      const pendingSync = await AsyncStorage.getItem(PENDING_SYNC_KEY);
      if (pendingSync) {
        const pendingCount = parseInt(pendingSync, 10);
        if (pendingCount > 0) {
          // Try to sync with database
          const success = await incrementUserField(userId, "daily_captures_used", pendingCount);
          if (success) {
            await incrementUserField(userId, "total_captures", pendingCount);
            await AsyncStorage.removeItem(PENDING_SYNC_KEY);
          }
        }
      }
    } catch (error) {
      console.error('Failed to sync pending increments:', error);
    }
  };
  
  const checkCaptureLimit = useCallback((): boolean => {
    if (!user || !isInitialized) {
      // If not initialized yet, allow capture (will be checked again)
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
  }, [user, isInitialized, localCapturesUsed, dailyCaptureLimit, showAlert]);
  
  const incrementCaptureCount = useCallback(async (): Promise<void> => {
    if (!userId) return;
    
    // Immediately update local state and persist
    const newCount = localCapturesUsed + 1;
    setLocalCapturesUsed(newCount);
    
    try {
      // Persist to AsyncStorage immediately
      await AsyncStorage.setItem(CAPTURE_COUNT_KEY, newCount.toString());
      await AsyncStorage.setItem(CAPTURE_COUNT_DATE_KEY, new Date().toDateString());
      
      // Track pending sync in case database update fails
      const currentPending = await AsyncStorage.getItem(PENDING_SYNC_KEY);
      const pendingCount = currentPending ? parseInt(currentPending, 10) : 0;
      await AsyncStorage.setItem(PENDING_SYNC_KEY, (pendingCount + 1).toString());
      
      // Try to update database (non-blocking)
      incrementUserField(userId, "daily_captures_used", 1)
        .then(async (success) => {
          if (success) {
            await incrementUserField(userId, "total_captures", 1);
            // Decrement pending sync count
            const pending = await AsyncStorage.getItem(PENDING_SYNC_KEY);
            if (pending) {
              const count = parseInt(pending, 10) - 1;
              if (count <= 0) {
                await AsyncStorage.removeItem(PENDING_SYNC_KEY);
              } else {
                await AsyncStorage.setItem(PENDING_SYNC_KEY, count.toString());
              }
            }
          }
        })
        .catch(error => {
          console.error('Failed to sync capture count to database:', error);
          // Count remains in pending sync for retry
        });
        
    } catch (error) {
      console.error('Failed to persist capture count:', error);
      // Still allow the capture but log the error
    }
  }, [userId, localCapturesUsed]);
  
  const syncWithDatabase = useCallback(async (): Promise<void> => {
    await syncPendingIncrements();
  }, [userId]);
  
  return {
    checkCaptureLimit,
    dailyCapturesUsed: localCapturesUsed,
    dailyCaptureLimit,
    incrementCaptureCount,
    syncWithDatabase
  };
};