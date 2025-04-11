import { useCallback, RefObject } from "react";
import { CameraView } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import { VlmIdentificationRequest, VlmIdentificationResponse } from "../../../shared/types/vlm";
import { IdentificationStatus } from "../types/camera";

interface UseCameraCaptureProps {
  cameraRef: RefObject<CameraView>;
  identifyPhoto: (payload: VlmIdentificationRequest) => Promise<VlmIdentificationResponse>;
  setIdentificationStatus: (status: IdentificationStatus) => void;
}

/**
 * Custom hook for handling camera capture and image identification
 */
export const useCameraCapture = ({
  cameraRef,
  identifyPhoto,
  setIdentificationStatus
}: UseCameraCaptureProps) => {
  
  /**
   * Process image identification
   */
  const processIdentification = async (base64Data: string) => {
    setIdentificationStatus({
      message: "Identifying...",
      isLoading: true
    });
    
    try {
      const result = await identifyPhoto({ 
        base64Data, 
        contentType: "image/jpeg" 
      });
      
      setIdentificationStatus({
        message: `Identified: ${result.label || "Unknown"}`,
        isLoading: false
      });
    } catch (error: any) {
      console.error("Error identifying image:", error);
      setIdentificationStatus({
        message: `Error: ${error.message || "Failed to identify"}`,
        isLoading: false
      });
    }
  };
  
  /**
   * Handle photo capture and identification
   */
  const captureAndIdentify = useCallback(async () => {
    if (!cameraRef.current) return;
    
    setIdentificationStatus({
      message: null,
      isLoading: false
    });
    
    try {
      // Take picture with base64 data for identification
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true
      });
      
      if (!photo) {
        setIdentificationStatus({
          message: "Failed to capture photo",
          isLoading: false
        });
        return;
      }

      // Save photo to media library
      if (photo.uri) {
        await MediaLibrary.saveToLibraryAsync(photo.uri);
      }
      
      // Process identification if base64 data is available
      if (photo.base64) {
        await processIdentification(photo.base64);
      }
    } catch (error) {
      console.error("Error taking picture:", error);
      setIdentificationStatus({
        message: "Error capturing image",
        isLoading: false
      });
    }
  }, [cameraRef, identifyPhoto, setIdentificationStatus]);

  return {
    captureAndIdentify
  };
};
