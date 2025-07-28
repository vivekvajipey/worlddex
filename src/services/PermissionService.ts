import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Camera from 'expo-camera';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';

export type PermissionType = 'camera' | 'location' | 'notification' | 'photoLibrary';
export type PermissionStatus = 'undetermined' | 'granted' | 'denied' | 'restricted';

export interface PermissionState {
  status: PermissionStatus;
  lastRequested?: string; // ISO date string
  softDeniedAt?: string; // ISO date string
  primerShownAt?: string; // ISO date string
  grantedAt?: string; // ISO date string
  primerShownCount?: number;
}

const STORAGE_PREFIX = '@worlddex_permission_';
const SOFT_DENIAL_RETRY_DAYS = 7;
const MAX_PRIMER_SHOWS = 3;

export class PermissionService {
  /**
   * Get current permission status without triggering a request
   */
  static async getStatus(type: PermissionType): Promise<PermissionStatus> {
    try {
      switch (type) {
        case 'camera': {
          const { status } = await Camera.getCameraPermissionsAsync();
          return status as PermissionStatus;
        }
        case 'location': {
          const { status } = await Location.getForegroundPermissionsAsync();
          return status as PermissionStatus;
        }
        case 'notification': {
          const { status } = await Notifications.getPermissionsAsync();
          return status as PermissionStatus;
        }
        case 'photoLibrary': {
          const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
          return status as PermissionStatus;
        }
        default:
          return 'undetermined';
      }
    } catch (error) {
      console.error(`Error getting ${type} permission status:`, error);
      return 'undetermined';
    }
  }

  /**
   * Get full permission state from storage
   */
  static async getState(type: PermissionType): Promise<PermissionState> {
    try {
      const stored = await AsyncStorage.getItem(`${STORAGE_PREFIX}${type}`);
      const currentStatus = await this.getStatus(type);
      
      if (stored) {
        const state = JSON.parse(stored) as PermissionState;
        // Always use current status from system
        state.status = currentStatus;
        return state;
      }
      
      return { status: currentStatus };
    } catch (error) {
      console.error(`Error getting ${type} permission state:`, error);
      const status = await this.getStatus(type);
      return { status };
    }
  }

  /**
   * Update permission state in storage
   */
  static async updateState(type: PermissionType, updates: Partial<PermissionState>): Promise<void> {
    try {
      const currentState = await this.getState(type);
      const newState = { ...currentState, ...updates };
      
      await AsyncStorage.setItem(
        `${STORAGE_PREFIX}${type}`,
        JSON.stringify(newState)
      );
    } catch (error) {
      console.error(`Error updating ${type} permission state:`, error);
    }
  }

  /**
   * Check if we should show the permission primer
   */
  static async shouldShowPrimer(type: PermissionType): Promise<boolean> {
    const state = await this.getState(type);
    
    // Don't show if already granted or denied
    if (state.status !== 'undetermined') {
      return false;
    }
    
    // Check if we've shown primer too many times
    if (state.primerShownCount && state.primerShownCount >= MAX_PRIMER_SHOWS) {
      return false;
    }
    
    // Check soft denial cooldown
    if (state.softDeniedAt) {
      const daysSinceDenial = this.daysSince(state.softDeniedAt);
      if (daysSinceDenial < SOFT_DENIAL_RETRY_DAYS) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Request permission (without primer - primer should be handled by UI)
   */
  static async requestPermission(type: PermissionType): Promise<boolean> {
    try {
      let status: PermissionStatus = 'undetermined';
      
      switch (type) {
        case 'camera': {
          const result = await Camera.requestCameraPermissionsAsync();
          status = result.status as PermissionStatus;
          break;
        }
        case 'location': {
          const result = await Location.requestForegroundPermissionsAsync();
          status = result.status as PermissionStatus;
          break;
        }
        case 'notification': {
          const result = await Notifications.requestPermissionsAsync();
          status = result.status as PermissionStatus;
          break;
        }
        case 'photoLibrary': {
          const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
          status = result.status as PermissionStatus;
          break;
        }
      }
      
      // Update state based on result
      const updates: Partial<PermissionState> = {
        status,
        lastRequested: new Date().toISOString()
      };
      
      if (status === 'granted') {
        updates.grantedAt = new Date().toISOString();
      }
      
      await this.updateState(type, updates);
      
      return status === 'granted';
    } catch (error) {
      console.error(`Error requesting ${type} permission:`, error);
      return false;
    }
  }

  /**
   * Mark that primer was shown
   */
  static async markPrimerShown(type: PermissionType): Promise<void> {
    const state = await this.getState(type);
    await this.updateState(type, {
      primerShownAt: new Date().toISOString(),
      primerShownCount: (state.primerShownCount || 0) + 1
    });
  }

  /**
   * Mark soft denial (user clicked "Not Now" on primer)
   */
  static async markSoftDenial(type: PermissionType): Promise<void> {
    await this.updateState(type, {
      softDeniedAt: new Date().toISOString()
    });
  }

  /**
   * Check if permission was ever requested
   */
  static async wasRequested(type: PermissionType): Promise<boolean> {
    const state = await this.getState(type);
    return !!state.lastRequested || state.status !== 'undetermined';
  }

  /**
   * Reset permission state (useful for testing)
   */
  static async resetState(type: PermissionType): Promise<void> {
    await AsyncStorage.removeItem(`${STORAGE_PREFIX}${type}`);
  }

  /**
   * Helper to calculate days since a date
   */
  private static daysSince(dateString: string): number {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    return diffMs / (1000 * 60 * 60 * 24);
  }
}