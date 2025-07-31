import { useState, useCallback, useRef } from 'react';
import { usePostHog } from 'posthog-react-native';
import { OfflineCaptureService } from '../services/offlineCaptureService';
import { useAlert } from '../contexts/AlertContext';

interface CaptureBox {
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio: number;
}

interface UseOfflineCaptureReturn {
  savedOffline: boolean;
  setSavedOffline: (saved: boolean) => void;
  saveOfflineCapture: (params: {
    capturedUri: string;
    location?: { latitude: number; longitude: number };
    captureBox: CaptureBox;
    userId: string;
    method: 'lasso' | 'full_screen' | 'auto_dismiss';
    reason: string;
  }) => Promise<void>;
  initializeOfflineService: (userId: string) => void;
}

export const useOfflineCapture = (): UseOfflineCaptureReturn => {
  const [savedOffline, setSavedOffline] = useState(false);
  const offlineSaveInProgressRef = useRef(false);
  const { showAlert } = useAlert();
  const posthog = usePostHog();

  // Initialize offline capture service
  const initializeOfflineService = useCallback((userId: string) => {
    OfflineCaptureService.initialize(userId).catch(console.error);
  }, []);

  // Save capture offline
  const saveOfflineCapture = useCallback(async ({
    capturedUri,
    location,
    captureBox,
    userId,
    method,
    reason
  }: {
    capturedUri: string;
    location?: { latitude: number; longitude: number };
    captureBox: CaptureBox;
    userId: string;
    method: 'lasso' | 'full_screen' | 'auto_dismiss';
    reason: string;
  }) => {
    if (offlineSaveInProgressRef.current) {
      console.log('[OFFLINE] Save already in progress, skipping');
      return;
    }

    offlineSaveInProgressRef.current = true;

    try {
      const localImageUri = await OfflineCaptureService.saveImageLocally(capturedUri, userId);
      
      await OfflineCaptureService.savePendingCapture({
        imageUri: localImageUri,
        capturedAt: new Date().toISOString(),
        location: location ? { 
          latitude: location.latitude, 
          longitude: location.longitude 
        } : undefined,
        captureBox: captureBox
      }, userId);

      console.log('[OFFLINE] Successfully saved offline capture');
      
      // Track offline capture
      if (posthog) {
        posthog.capture("offline_capture_saved", {
          method,
          reason
        });
      }

      // Show success message for certain methods
      if (method === 'auto_dismiss') {
        setTimeout(() => {
          showAlert({
            title: "Saved for Later",
            message: "Your capture can be identified when you're back online.",
            icon: "save-outline",
            iconColor: "#10B981"
          });
        }, 300);
      }
    } catch (saveError) {
      console.error('Failed to save offline capture:', saveError);
      showAlert({
        title: "Error",
        message: "Failed to save capture. Please try again.",
        icon: "alert-circle-outline",
        iconColor: "#EF4444"
      });
      throw saveError;
    } finally {
      offlineSaveInProgressRef.current = false;
    }
  }, [showAlert, posthog]);

  return {
    savedOffline,
    setSavedOffline,
    saveOfflineCapture,
    initializeOfflineService
  };
};