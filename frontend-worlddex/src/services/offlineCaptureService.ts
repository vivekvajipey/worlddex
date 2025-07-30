import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import uuid from 'react-native-uuid';

// Constants
const STORAGE_KEY_PREFIX = '@worlddex_pending_captures_';
const IMAGE_DIR_PREFIX = `${FileSystem.documentDirectory}pending_captures/`;
const MAX_PENDING_CAPTURES = 50;
const MAX_AGE_DAYS = 30;

// Types
export interface PendingCapture {
  id: string;
  imageUri: string;
  capturedAt: string;
  location?: { latitude: number; longitude: number };
  captureBox?: { x: number; y: number; width: number; height: number; aspectRatio: number };
  status: 'pending' | 'identifying' | 'failed' | 'temporary';
  error?: string;
  dailyCaptureDate: string; // YYYY-MM-DD in PST
  // Fields for temporary captures (already identified)
  label?: string;
  rarityTier?: string;
  rarityScore?: number;
}

export class OfflineCaptureService {
  // Get user-specific storage key
  private static getStorageKey(userId: string): string {
    return `${STORAGE_KEY_PREFIX}${userId}`;
  }

  // Get user-specific image directory
  private static getImageDir(userId: string): string {
    return `${IMAGE_DIR_PREFIX}${userId}/`;
  }

  // Initialize the service and ensure directory exists
  static async initialize(userId: string): Promise<void> {
    try {
      const userDir = this.getImageDir(userId);
      const dirInfo = await FileSystem.getInfoAsync(userDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(userDir, { intermediates: true });
      }
    } catch (error) {
      console.error('Failed to initialize offline capture directory:', error);
      throw error;
    }
  }

  // Get today's date in PST timezone (YYYY-MM-DD format)
  static getTodayPST(): string {
    const now = new Date();
    const pstDate = toZonedTime(now, 'America/Los_Angeles');
    return format(pstDate, 'yyyy-MM-dd');
  }

  // Save an image locally and return the new URI
  static async saveImageLocally(sourceUri: string, userId: string): Promise<string> {
    try {
      const filename = `${uuid.v4()}.jpg`;
      const userDir = this.getImageDir(userId);
      const destUri = `${userDir}${filename}`;
      
      // Ensure user directory exists
      await this.initialize(userId);
      
      await FileSystem.copyAsync({
        from: sourceUri,
        to: destUri
      });
      
      return destUri;
    } catch (error) {
      console.error('Failed to save image locally:', error);
      throw error;
    }
  }

  // Save a pending capture
  static async savePendingCapture(capture: Omit<PendingCapture, 'id' | 'dailyCaptureDate' | 'status'>, userId: string): Promise<PendingCapture> {
    try {
      // Create the full pending capture object
      const pendingCapture: PendingCapture = {
        ...capture,
        id: uuid.v4() as string,
        dailyCaptureDate: this.getTodayPST(),
        status: 'pending'
      };

      // Get existing captures
      const existing = await this.getAllPendingCaptures(userId);
      
      // Check if we've hit the limit
      if (existing.length >= MAX_PENDING_CAPTURES) {
        throw new Error(`Maximum pending captures (${MAX_PENDING_CAPTURES}) reached. Please identify some captures before taking more.`);
      }

      // Add new capture
      existing.push(pendingCapture);
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(this.getStorageKey(userId), JSON.stringify(existing));
      
      return pendingCapture;
    } catch (error) {
      console.error('Failed to save pending capture:', error);
      throw error;
    }
  }

  // Get all pending captures
  static async getAllPendingCaptures(userId: string): Promise<PendingCapture[]> {
    try {
      const data = await AsyncStorage.getItem(this.getStorageKey(userId));
      if (!data) return [];
      
      const captures: PendingCapture[] = JSON.parse(data);
      
      // Filter out old captures and clean them up
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - MAX_AGE_DAYS);
      
      const validCaptures = captures.filter(capture => {
        const captureDate = new Date(capture.capturedAt);
        if (captureDate < cutoffDate) {
          // Clean up old image
          this.deleteImageFile(capture.imageUri).catch(console.error);
          return false;
        }
        return true;
      });
      
      // Update storage if we filtered any out
      if (validCaptures.length !== captures.length) {
        await AsyncStorage.setItem(this.getStorageKey(userId), JSON.stringify(validCaptures));
      }
      
      return validCaptures;
    } catch (error) {
      console.error('Failed to get pending captures:', error);
      return [];
    }
  }

  // Get pending captures for today (PST)
  static async getTodaysPendingCaptures(userId: string): Promise<PendingCapture[]> {
    const allCaptures = await this.getAllPendingCaptures(userId);
    const todayPST = this.getTodayPST();
    
    return allCaptures.filter(capture => capture.dailyCaptureDate === todayPST);
  }

  // Update capture status
  static async updateCaptureStatus(
    captureId: string, 
    status: PendingCapture['status'], 
    userId: string,
    error?: string
  ): Promise<void> {
    try {
      const captures = await this.getAllPendingCaptures(userId);
      const index = captures.findIndex(c => c.id === captureId);
      
      if (index === -1) {
        throw new Error('Capture not found');
      }
      
      captures[index] = {
        ...captures[index],
        status,
        error
      };
      
      await AsyncStorage.setItem(this.getStorageKey(userId), JSON.stringify(captures));
    } catch (error) {
      console.error('Failed to update capture status:', error);
      throw error;
    }
  }

  // Delete a pending capture (after successful identification)
  static async deletePendingCapture(captureId: string, userId: string): Promise<void> {
    try {
      const captures = await this.getAllPendingCaptures(userId);
      const capture = captures.find(c => c.id === captureId);
      
      if (!capture) {
        throw new Error('Capture not found');
      }
      
      // Delete the image file
      await this.deleteImageFile(capture.imageUri);
      
      // Remove from array
      const updatedCaptures = captures.filter(c => c.id !== captureId);
      
      // Update storage
      await AsyncStorage.setItem(this.getStorageKey(userId), JSON.stringify(updatedCaptures));
    } catch (error) {
      console.error('Failed to delete pending capture:', error);
      throw error;
    }
  }

  // Helper to delete image file
  private static async deleteImageFile(uri: string): Promise<void> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    } catch (error) {
      console.error('Failed to delete image file:', error);
      // Don't throw - this is a cleanup operation
    }
  }

  // Get count of pending captures for a specific date
  static async getPendingCountForDate(date: string, userId: string): Promise<number> {
    const captures = await this.getAllPendingCaptures(userId);
    return captures.filter(c => c.dailyCaptureDate === date).length;
  }

  // Clear all pending captures (for debugging/testing)
  static async clearAllPendingCaptures(userId: string): Promise<void> {
    try {
      const captures = await this.getAllPendingCaptures(userId);
      
      // Delete all image files
      await Promise.all(
        captures.map(capture => this.deleteImageFile(capture.imageUri))
      );
      
      // Clear storage
      await AsyncStorage.removeItem(this.getStorageKey(userId));
      
      // Remove directory and recreate
      const userDir = this.getImageDir(userId);
      await FileSystem.deleteAsync(userDir, { idempotent: true });
      await FileSystem.makeDirectoryAsync(userDir, { intermediates: true });
    } catch (error) {
      console.error('Failed to clear pending captures:', error);
      throw error;
    }
  }

  // Save a temporary capture (already identified, waiting for DB save)
  static async saveTemporaryCapture(capture: Omit<PendingCapture, 'id' | 'dailyCaptureDate' | 'status'> & {
    label: string;
    rarityTier: string;
    rarityScore?: number;
  }, userId: string): Promise<PendingCapture> {
    try {
      // Save image locally to ensure it persists
      const localImageUri = await this.saveImageLocally(capture.imageUri, userId);
      
      const tempCapture: PendingCapture = {
        ...capture,
        imageUri: localImageUri, // Use the local copy
        id: `temp_${Date.now()}_${uuid.v4()}`, // Unique temp ID
        dailyCaptureDate: this.getTodayPST(),
        status: 'temporary'
      };

      // Get existing captures
      const existing = await this.getAllPendingCaptures(userId);
      
      // Add new temporary capture
      existing.push(tempCapture);
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(this.getStorageKey(userId), JSON.stringify(existing));
      
      console.log('[CAPTURE FLOW] Temporary capture saved', {
        timestamp: new Date().toISOString(),
        tempId: tempCapture.id,
        label: tempCapture.label,
        localImageUri: localImageUri
      });
      
      return tempCapture;
    } catch (error) {
      console.error('Failed to save temporary capture:', error);
      throw error;
    }
  }

  // Get only temporary captures
  static async getTemporaryCaptures(userId: string): Promise<PendingCapture[]> {
    const allCaptures = await this.getAllPendingCaptures(userId);
    return allCaptures.filter(c => c.status === 'temporary');
  }
}