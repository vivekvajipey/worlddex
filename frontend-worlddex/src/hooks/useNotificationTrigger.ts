import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../../database/supabase-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { NotificationService } from '../services/NotificationService';

const NOTIFICATION_TRIGGER_KEY = '@worlddex_notification_trigger';
const CAPTURES_THRESHOLD = 3;
const DAYS_THRESHOLD = 2;

interface NotificationTriggerData {
  lastPromptedAt?: string;
  hasBeenPrompted: boolean;
  permissionGranted: boolean;
  triggeredAt?: string;
}

export const useNotificationTrigger = () => {
  const { session } = useAuth();
  const [shouldShowPrompt, setShouldShowPrompt] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Check if notification triggers are met
  const checkTriggers = useCallback(async (): Promise<boolean> => {
    if (!session?.user?.id) return false;

    try {
      // Get stored trigger data
      const storedData = await AsyncStorage.getItem(NOTIFICATION_TRIGGER_KEY);
      const triggerData: NotificationTriggerData = storedData 
        ? JSON.parse(storedData) 
        : { hasBeenPrompted: false, permissionGranted: false };

      // Check current permission status
      const { status } = await Notifications.getPermissionsAsync();
      if (status === 'granted') {
        // Already have permission, no need to prompt
        return false;
      }

      // If already prompted recently, don't prompt again
      if (triggerData.lastPromptedAt) {
        const daysSincePrompt = daysSince(triggerData.lastPromptedAt);
        if (daysSincePrompt < 14) {
          // Wait 14 days before re-prompting
          return false;
        }
      }

      // Get user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('created_at')
        .eq('id', session.user.id)
        .single();

      if (userError || !userData) return false;

      // Get capture count
      const { count: captureCount, error: captureError } = await supabase
        .from('captures')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

      if (captureError) return false;

      // Check triggers
      const daysSinceJoined = daysSince(userData.created_at);
      const hasEnoughCaptures = (captureCount || 0) >= CAPTURES_THRESHOLD;
      const hasBeenLongEnough = daysSinceJoined >= DAYS_THRESHOLD;

      console.log('Notification trigger check:', {
        captureCount,
        daysSinceJoined,
        hasEnoughCaptures,
        hasBeenLongEnough,
        hasBeenPrompted: triggerData.hasBeenPrompted
      });

      // Trigger if either condition is met and haven't prompted in this session
      const shouldTrigger = (hasEnoughCaptures || hasBeenLongEnough) && !triggerData.triggeredAt;
      
      // If we should trigger, mark it immediately to prevent loops
      if (shouldTrigger) {
        await AsyncStorage.setItem(NOTIFICATION_TRIGGER_KEY, JSON.stringify({
          ...triggerData,
          triggeredAt: new Date().toISOString()
        }));
      }
      
      return shouldTrigger;
    } catch (error) {
      console.error('Error checking notification triggers:', error);
      return false;
    }
  }, [session]);

  // Mark that prompt was shown
  const markPromptShown = useCallback(async () => {
    try {
      const storedData = await AsyncStorage.getItem(NOTIFICATION_TRIGGER_KEY);
      const triggerData: NotificationTriggerData = storedData 
        ? JSON.parse(storedData) 
        : { hasBeenPrompted: false, permissionGranted: false };

      await AsyncStorage.setItem(NOTIFICATION_TRIGGER_KEY, JSON.stringify({
        ...triggerData,
        hasBeenPrompted: true,
        lastPromptedAt: new Date().toISOString(),
        triggeredAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error marking prompt shown:', error);
    }
  }, []);

  // Handle permission granted
  const handlePermissionGranted = useCallback(async () => {
    try {
      // Schedule daily notifications
      await NotificationService.scheduleDailyNotification();
      
      // Update stored data
      const storedData = await AsyncStorage.getItem(NOTIFICATION_TRIGGER_KEY);
      const triggerData: NotificationTriggerData = storedData 
        ? JSON.parse(storedData) 
        : { hasBeenPrompted: false, permissionGranted: false };

      await AsyncStorage.setItem(NOTIFICATION_TRIGGER_KEY, JSON.stringify({
        ...triggerData,
        permissionGranted: true
      }));
    } catch (error) {
      console.error('Error handling permission granted:', error);
    }
  }, []);

  // Check triggers once on mount
  useEffect(() => {
    if (!session?.user?.id) return;

    const checkAndUpdate = async () => {
      setIsChecking(true);
      const shouldShow = await checkTriggers();
      setShouldShowPrompt(shouldShow);
      setIsChecking(false);
    };

    // Check once when component mounts
    checkAndUpdate();
  }, [session?.user?.id]); // Only re-check if user changes
  
  // Provide a manual way to re-check triggers
  const recheckTriggers = useCallback(async () => {
    if (!session?.user?.id) return;
    
    setIsChecking(true);
    const shouldShow = await checkTriggers();
    setShouldShowPrompt(shouldShow);
    setIsChecking(false);
  }, [session, checkTriggers]);

  return {
    shouldShowPrompt,
    isChecking,
    markPromptShown,
    handlePermissionGranted,
    checkTriggers,
    recheckTriggers
  };
};

// Helper function to calculate days since a date
function daysSince(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return diffMs / (1000 * 60 * 60 * 24);
}