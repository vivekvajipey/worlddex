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
  trackIdentifyAttempt: () => boolean;
  checkIdentifyLimit: () => boolean;
}

const DAILY_IDENTIFY_LIMIT = 50; // Adjust as needed
// const DAILY_IDENTIFY_LIMIT = 3; // For testing

export const useCaptureLimitsWithPersistence = (userId: string | null): UseCaptureLimitsReturn => {
  const { user } = useUser(userId);
  const { showAlert } = useAlert();
  
  // Local state for immediate updates
  const [localCapturesUsed, setLocalCapturesUsed] = useState<number>(0);
  const [localIdentifyAttempts, setLocalIdentifyAttempts] = useState<number>(0);
  const [pendingIdentifyAttempts, setPendingIdentifyAttempts] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const dailyCaptureLimit = 10;
  
  // Generate user-specific storage keys
  const CAPTURE_COUNT_KEY = userId ? `@capture_count_local_${userId}` : '@capture_count_local';
  const CAPTURE_COUNT_DATE_KEY = userId ? `@capture_count_date_${userId}` : '@capture_count_date';
  const PENDING_SYNC_KEY = userId ? `@capture_count_pending_sync_${userId}` : '@capture_count_pending_sync';
  const IDENTIFY_ATTEMPTS_KEY = userId ? `@identify_attempts_local_${userId}` : '@identify_attempts_local';
  const PENDING_IDENTIFY_SYNC_KEY = userId ? `@identify_attempts_pending_sync_${userId}` : '@identify_attempts_pending_sync';
  
  // Reset initialization flag when userId changes
  useEffect(() => {
    setIsInitialized(false);
  }, [userId]);
  
  // Initialize from AsyncStorage and sync with database
  useEffect(() => {
    if (!userId) return;
    
    const initializeCaptureCounts = async () => {
      try {
        // Check if we need to reset daily count (new day)
        const storedDate = await AsyncStorage.getItem(CAPTURE_COUNT_DATE_KEY);
        const today = new Date().toDateString();
        
        if (storedDate !== today) {
          // New day - reset local counts
          await AsyncStorage.setItem(CAPTURE_COUNT_KEY, '0');
          await AsyncStorage.setItem(IDENTIFY_ATTEMPTS_KEY, '0');
          await AsyncStorage.setItem(CAPTURE_COUNT_DATE_KEY, today);
          await AsyncStorage.removeItem(PENDING_SYNC_KEY);
          await AsyncStorage.removeItem(PENDING_IDENTIFY_SYNC_KEY);
          setLocalCapturesUsed(0);
          setLocalIdentifyAttempts(0);
          setPendingIdentifyAttempts(0);
        } else {
          // Same day - load stored counts
          const storedCount = await AsyncStorage.getItem(CAPTURE_COUNT_KEY);
          const localCount = storedCount ? parseInt(storedCount, 10) : 0;
          
          const storedIdentifyAttempts = await AsyncStorage.getItem(IDENTIFY_ATTEMPTS_KEY);
          const localIdentify = storedIdentifyAttempts ? parseInt(storedIdentifyAttempts, 10) : 0;
          
          // Use the higher value between local and database
          const dbCount = user?.daily_captures_used || 0;
          const actualCount = Math.max(localCount, dbCount);
          
          const dbIdentifyAttempts = user?.daily_identify_attempts || 0;
          const actualIdentifyAttempts = Math.max(localIdentify, dbIdentifyAttempts);
          
          console.log(`[CaptureLimit] Initialized for user ${user?.username || userId} - Admin: ${user?.is_admin || false}, Captures: ${actualCount}/10, Identify attempts: ${actualIdentifyAttempts}/${DAILY_IDENTIFY_LIMIT}`);
          
          setLocalCapturesUsed(actualCount);
          setLocalIdentifyAttempts(actualIdentifyAttempts);
          await AsyncStorage.setItem(CAPTURE_COUNT_KEY, actualCount.toString());
          await AsyncStorage.setItem(IDENTIFY_ATTEMPTS_KEY, actualIdentifyAttempts.toString());
          
          // Load pending sync counts
          const pendingIdentify = await AsyncStorage.getItem(PENDING_IDENTIFY_SYNC_KEY);
          if (pendingIdentify) {
            setPendingIdentifyAttempts(parseInt(pendingIdentify, 10));
          }
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
  }, [userId, user?.daily_captures_used, user?.daily_identify_attempts, CAPTURE_COUNT_KEY, CAPTURE_COUNT_DATE_KEY, PENDING_SYNC_KEY, IDENTIFY_ATTEMPTS_KEY, PENDING_IDENTIFY_SYNC_KEY]);
  
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
    
    // Admins have unlimited captures
    if (user.is_admin) {
      console.log('[CaptureLimit] Admin user detected - unlimited captures allowed');
      return true;
    }
    
    console.log(`[CaptureLimit] User ${user.username || user.id} - Captures used: ${localCapturesUsed}/${dailyCaptureLimit}`);
    
    // Use local state for immediate checking
    if (localCapturesUsed >= dailyCaptureLimit) {
      console.log(`[CaptureLimit] Daily limit reached for user ${user.username || user.id}`);
      showAlert({
        title: "Daily Limit Reached",
        message: `You have used all ${dailyCaptureLimit} daily captures! They will reset at midnight UTC.`,
        icon: "timer-outline",
        iconColor: "#EF4444"
      });
      return false;
    }
    
    return true;
  }, [user, isInitialized, localCapturesUsed, dailyCaptureLimit, showAlert]);
  
  const incrementCaptureCount = useCallback(async (): Promise<void> => {
    if (!userId) return;
    
    // Log capture increment
    console.log(`[CaptureLimit] Incrementing capture count for user ${user?.username || userId} (admin: ${user?.is_admin || false})`);
    
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
            
            // Also sync any pending identify attempts
            if (pendingIdentifyAttempts > 0) {
              console.log(`[CaptureLimit] Syncing ${pendingIdentifyAttempts} pending identify attempts`);
              await incrementUserField(userId, "daily_identify_attempts", pendingIdentifyAttempts);
              await incrementUserField(userId, "total_identify_attempts", pendingIdentifyAttempts);
              setPendingIdentifyAttempts(0);
              await AsyncStorage.removeItem(PENDING_IDENTIFY_SYNC_KEY);
            }
            
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
  }, [userId, user, localCapturesUsed, pendingIdentifyAttempts, CAPTURE_COUNT_KEY, CAPTURE_COUNT_DATE_KEY, PENDING_SYNC_KEY, PENDING_IDENTIFY_SYNC_KEY]);
  
  const syncWithDatabase = useCallback(async (): Promise<void> => {
    await syncPendingIncrements();
  }, [userId]);
  
  // Check if user can make identify request
  const checkIdentifyLimit = useCallback((): boolean => {
    if (!user || !isInitialized) {
      return true;
    }
    
    // Admins have unlimited identify attempts
    if (user.is_admin) {
      return true;
    }
    
    // Check against limit and show alert
    if (localIdentifyAttempts >= DAILY_IDENTIFY_LIMIT) {
      console.log(`[CaptureLimit] Daily identify limit reached for user ${user.username || user.id} (${localIdentifyAttempts}/${DAILY_IDENTIFY_LIMIT})`);
      showAlert({
        title: "Too Many Attempts",
        message: "You've reached the daily limit for capture attempts. Please try again tomorrow!",
        icon: "alert-circle-outline",
        iconColor: "#EF4444"
      });
      return false;
    }
    
    return true;
  }, [user, isInitialized, localIdentifyAttempts, showAlert]);
  
  // Track an identify attempt
  const trackIdentifyAttempt = useCallback((): boolean => {
    if (!userId || !isInitialized) {
      return true;
    }
    
    // Check limit first
    if (!checkIdentifyLimit()) {
      return false;
    }
    
    // Increment local count
    const newCount = localIdentifyAttempts + 1;
    setLocalIdentifyAttempts(newCount);
    setPendingIdentifyAttempts(prev => prev + 1);
    
    console.log(`[CaptureLimit] Tracked identify attempt ${newCount} for user ${user?.username || userId}`);
    
    // Persist to AsyncStorage
    AsyncStorage.setItem(IDENTIFY_ATTEMPTS_KEY, newCount.toString()).catch(console.error);
    AsyncStorage.setItem(PENDING_IDENTIFY_SYNC_KEY, pendingIdentifyAttempts.toString()).catch(console.error);
    
    return true;
  }, [userId, user, isInitialized, localIdentifyAttempts, checkIdentifyLimit, pendingIdentifyAttempts, IDENTIFY_ATTEMPTS_KEY, PENDING_IDENTIFY_SYNC_KEY]);
  
  return {
    checkCaptureLimit,
    dailyCapturesUsed: localCapturesUsed,
    dailyCaptureLimit,
    incrementCaptureCount,
    syncWithDatabase,
    trackIdentifyAttempt,
    checkIdentifyLimit
  };
};