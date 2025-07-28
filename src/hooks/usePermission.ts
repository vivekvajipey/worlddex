import { useState, useEffect, useCallback } from 'react';
import { PermissionService, PermissionType, PermissionStatus } from '../services/PermissionService';
import { useAuth } from '../contexts/AuthContext';
import { usePostHog } from 'posthog-react-native';

interface UsePermissionOptions {
  skipPrimer?: boolean;
  onPrimerShow?: () => void;
  onPrimerAllow?: () => void;
  onPrimerDeny?: () => void;
}

export const usePermission = (type: PermissionType, options?: UsePermissionOptions) => {
  const [status, setStatus] = useState<PermissionStatus>('undetermined');
  const [isLoading, setIsLoading] = useState(true);
  const [showPrimer, setShowPrimer] = useState(false);
  const { session } = useAuth();
  const posthog = usePostHog();
  const userId = session?.user?.id;

  // Check current permission status
  const checkPermission = useCallback(async () => {
    try {
      const currentStatus = await PermissionService.getStatus(type);
      setStatus(currentStatus);
      setIsLoading(false);
      
      // Sync with database if user is logged in
      if (userId) {
        await PermissionService.syncWithDatabase(userId, type);
      }
    } catch (error) {
      console.error(`Error checking ${type} permission:`, error);
      setIsLoading(false);
    }
  }, [type, userId]);

  // Request permission with optional primer
  const requestPermission = useCallback(async (requestOptions?: UsePermissionOptions): Promise<boolean> => {
    const mergedOptions = { ...options, ...requestOptions };
    
    try {
      // Check if we should show primer
      if (!mergedOptions.skipPrimer && status === 'undetermined') {
        const shouldShow = await PermissionService.shouldShowPrimer(type);
        
        if (shouldShow) {
          // Show primer and return - actual request will be handled by primer callbacks
          setShowPrimer(true);
          await PermissionService.markPrimerShown(type);
          
          // Log analytics
          if (userId) {
            await PermissionService.logEvent(userId, type, 'primer_shown');
          }
          posthog?.capture('permission_primer_shown', { type });
          
          mergedOptions.onPrimerShow?.();
          return false; // Permission not yet granted
        }
      }
      
      // Request permission directly
      const granted = await PermissionService.requestPermission(type);
      
      // Log analytics
      if (userId) {
        await PermissionService.logEvent(
          userId, 
          type, 
          granted ? 'native_granted' : 'native_denied'
        );
      }
      posthog?.capture('permission_request_result', { type, granted });
      
      // Update local state
      await checkPermission();
      
      return granted;
    } catch (error) {
      console.error(`Error requesting ${type} permission:`, error);
      return false;
    }
  }, [type, status, userId, posthog, options, checkPermission]);

  // Handle primer allow
  const handlePrimerAllow = useCallback(async () => {
    setShowPrimer(false);
    
    // Log analytics
    if (userId) {
      await PermissionService.logEvent(userId, type, 'primer_allowed');
    }
    posthog?.capture('permission_primer_response', { type, action: 'allow' });
    
    options?.onPrimerAllow?.();
    
    // Request actual permission
    const granted = await PermissionService.requestPermission(type);
    
    // Log result
    if (userId) {
      await PermissionService.logEvent(
        userId, 
        type, 
        granted ? 'native_granted' : 'native_denied'
      );
    }
    
    await checkPermission();
    return granted;
  }, [type, userId, posthog, options, checkPermission]);

  // Handle primer deny
  const handlePrimerDeny = useCallback(async () => {
    setShowPrimer(false);
    
    // Mark soft denial
    await PermissionService.markSoftDenial(type);
    
    // Log analytics
    if (userId) {
      await PermissionService.logEvent(userId, type, 'primer_denied');
    }
    posthog?.capture('permission_primer_response', { type, action: 'deny' });
    
    options?.onPrimerDeny?.();
  }, [type, userId, posthog, options]);

  // Check permission on mount and when type changes
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  return {
    // Permission state
    status,
    isLoading,
    isGranted: status === 'granted',
    isDenied: status === 'denied',
    isUndetermined: status === 'undetermined',
    
    // Actions
    requestPermission,
    checkPermission,
    
    // Primer state and handlers
    showPrimer,
    handlePrimerAllow,
    handlePrimerDeny,
  };
};