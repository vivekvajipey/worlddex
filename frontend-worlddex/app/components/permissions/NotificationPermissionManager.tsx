import React, { useState, useEffect, useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import { PermissionPrimer } from './PermissionPrimer';
import { useNotificationTrigger } from '../../../src/hooks/useNotificationTrigger';
import { usePostHog } from 'posthog-react-native';
import { useAuth } from '../../../src/contexts/AuthContext';

export const NotificationPermissionManager: React.FC = () => {
  const [showPrimer, setShowPrimer] = useState(false);
  const [hasShownThisSession, setHasShownThisSession] = useState(false);
  const { shouldShowPrompt, markPromptShown, handlePermissionGranted, recheckTriggers } = useNotificationTrigger();
  const posthog = usePostHog();
  const { session } = useAuth();

  // Show primer when triggers are met
  useEffect(() => {
    // Only check once per session to prevent loops
    if (shouldShowPrompt && !showPrimer && !hasShownThisSession) {
      console.log('Showing notification permission primer');
      setShowPrimer(true);
      setHasShownThisSession(true);
      markPromptShown();
      
      // Track analytics
      posthog?.capture('notification_primer_shown', {
        trigger: 'engagement_threshold'
      });
    }
  }, [shouldShowPrompt, showPrimer, hasShownThisSession, markPromptShown, posthog]);

  // Handle allow button
  const handleAllow = useCallback(async () => {
    setShowPrimer(false);
    
    // Track analytics
    posthog?.capture('notification_primer_response', { action: 'allow' });
    
    try {
      // Request actual permission
      const { status } = await Notifications.requestPermissionsAsync();
      
      // Track result
      posthog?.capture('notification_permission_result', { 
        granted: status === 'granted' 
      });
      
      if (status === 'granted') {
        await handlePermissionGranted();
        
        // Show success message
        Alert.alert(
          'Notifications Enabled! 🎉',
          'You\'ll get a daily reminder to capture something new',
          [{ text: 'Great!', style: 'default' }]
        );
      } else if (status === 'denied') {
        // Show settings prompt
        Alert.alert(
          'Enable Notifications',
          'To get daily reminders, please enable notifications in your device settings.',
          [
            { text: 'Maybe Later', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  }, [handlePermissionGranted, posthog]);

  // Handle deny button
  const handleDeny = useCallback(() => {
    setShowPrimer(false);
    
    // Track analytics
    posthog?.capture('notification_primer_response', { action: 'deny' });
    
    // Don't request permission, just close
    // Will re-prompt after 14 days
  }, [posthog]);

  return (
    <PermissionPrimer
      visible={showPrimer}
      type="notification"
      onAllow={handleAllow}
      onDeny={handleDeny}
    />
  );
};