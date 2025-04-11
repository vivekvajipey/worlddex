import { useState } from 'react';
import { Platform } from 'react-native';
import { PhotoUpload, PhotoUploadResponse } from '../../../shared/types';
import { API_URL } from '../config';

// Add type declaration for fetch response
interface ErrorResponse {
  error: string;
}

interface UsePhotoUploadReturn {
  uploadPhoto: (photo: PhotoUpload) => Promise<PhotoUploadResponse>;
  isUploading: boolean;
  error: Error | null;
  reset: () => void;
}

export const usePhotoUpload = (): UsePhotoUploadReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reset = () => {
    setError(null);
    setIsUploading(false);
  };

  const uploadPhoto = async (photo: PhotoUpload): Promise<PhotoUploadResponse> => {
    try {
      setIsUploading(true);
      setError(null);

      const baseUrl = Platform.select({
        ios: API_URL,
        default: API_URL,
      });

      const response = await fetch(`${baseUrl}/photos/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(photo),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' })) as ErrorResponse;
        throw new Error(errorData.error || 'Failed to upload photo');
      }

      const data = await response.json();
      return data as PhotoUploadResponse;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to upload photo');
      setError(error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadPhoto,
    isUploading,
    error,
    reset,
  };
}; 