import { OfflineCaptureService, PendingCapture } from '../offlineCaptureService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

// Mock the dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-file-system');
jest.mock('react-native-uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234')
}));

// Mock date-fns-tz to return consistent PST dates
jest.mock('date-fns-tz', () => ({
  toZonedTime: jest.fn(() => new Date('2024-01-15T12:00:00-08:00'))
}));

describe('OfflineCaptureService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
    (FileSystem.copyAsync as jest.Mock).mockResolvedValue(undefined);
  });

  describe('initialize', () => {
    it('should create directory if it does not exist', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });
      
      await OfflineCaptureService.initialize();
      
      expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
        expect.stringContaining('pending_captures/'),
        { intermediates: true }
      );
    });
  });

  describe('getTodayPST', () => {
    it('should return today in PST format', () => {
      const result = OfflineCaptureService.getTodayPST();
      expect(result).toBe('2024-01-15');
    });
  });

  describe('saveImageLocally', () => {
    it('should copy image and return new URI', async () => {
      const sourceUri = 'file://temp/photo.jpg';
      
      const result = await OfflineCaptureService.saveImageLocally(sourceUri);
      
      expect(FileSystem.copyAsync).toHaveBeenCalledWith({
        from: sourceUri,
        to: expect.stringContaining('test-uuid-1234.jpg')
      });
      expect(result).toContain('test-uuid-1234.jpg');
    });
  });

  describe('savePendingCapture', () => {
    it('should save a new pending capture', async () => {
      const captureData = {
        imageUri: 'file://local/image.jpg',
        capturedAt: new Date().toISOString(),
        location: { latitude: 37.7749, longitude: -122.4194 },
        cameraFacing: 'back' as const,
        torchEnabled: false
      };
      
      const result = await OfflineCaptureService.savePendingCapture(captureData);
      
      expect(result).toMatchObject({
        ...captureData,
        id: 'test-uuid-1234',
        dailyCaptureDate: '2024-01-15',
        status: 'pending'
      });
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@worlddex_pending_captures',
        expect.stringContaining('test-uuid-1234')
      );
    });

    it('should throw error when max captures reached', async () => {
      const existingCaptures = Array(50).fill(null).map((_, i) => ({
        id: `capture-${i}`,
        imageUri: `file://image-${i}.jpg`,
        capturedAt: new Date().toISOString(),
        dailyCaptureDate: '2024-01-15',
        status: 'pending' as const
      }));
      
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(existingCaptures)
      );
      
      await expect(
        OfflineCaptureService.savePendingCapture({
          imageUri: 'file://new.jpg',
          capturedAt: new Date().toISOString(),
          cameraFacing: 'back',
          torchEnabled: false
        })
      ).rejects.toThrow('Maximum pending captures');
    });
  });

  describe('getAllPendingCaptures', () => {
    it('should return empty array when no captures exist', async () => {
      const result = await OfflineCaptureService.getAllPendingCaptures();
      expect(result).toEqual([]);
    });

    it('should filter out old captures', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35); // 35 days old
      
      const captures = [
        {
          id: '1',
          imageUri: 'file://old.jpg',
          capturedAt: oldDate.toISOString(),
          dailyCaptureDate: '2023-12-01',
          status: 'pending' as const
        },
        {
          id: '2',
          imageUri: 'file://recent.jpg',
          capturedAt: new Date().toISOString(),
          dailyCaptureDate: '2024-01-15',
          status: 'pending' as const
        }
      ];
      
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(captures));
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
      (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);
      
      const result = await OfflineCaptureService.getAllPendingCaptures();
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file://old.jpg', { idempotent: true });
    });
  });

  describe('getTodaysPendingCaptures', () => {
    it('should return only today\'s captures', async () => {
      const captures = [
        {
          id: '1',
          imageUri: 'file://yesterday.jpg',
          capturedAt: new Date().toISOString(),
          dailyCaptureDate: '2024-01-14',
          status: 'pending' as const
        },
        {
          id: '2',
          imageUri: 'file://today.jpg',
          capturedAt: new Date().toISOString(),
          dailyCaptureDate: '2024-01-15',
          status: 'pending' as const
        }
      ];
      
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(captures));
      
      const result = await OfflineCaptureService.getTodaysPendingCaptures();
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });
  });

  describe('updateCaptureStatus', () => {
    it('should update capture status', async () => {
      const captures = [{
        id: 'test-id',
        imageUri: 'file://test.jpg',
        capturedAt: new Date().toISOString(),
        dailyCaptureDate: '2024-01-15',
        status: 'pending' as const
      }];
      
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(captures));
      
      await OfflineCaptureService.updateCaptureStatus('test-id', 'identifying');
      
      const savedData = (AsyncStorage.setItem as jest.Mock).mock.calls[0][1];
      const savedCaptures = JSON.parse(savedData);
      
      expect(savedCaptures[0].status).toBe('identifying');
    });
  });

  describe('deletePendingCapture', () => {
    it('should delete capture and its image', async () => {
      const captures = [{
        id: 'test-id',
        imageUri: 'file://test.jpg',
        capturedAt: new Date().toISOString(),
        dailyCaptureDate: '2024-01-15',
        status: 'pending' as const
      }];
      
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(captures));
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
      
      await OfflineCaptureService.deletePendingCapture('test-id');
      
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file://test.jpg', { idempotent: true });
      
      const savedData = (AsyncStorage.setItem as jest.Mock).mock.calls[0][1];
      expect(JSON.parse(savedData)).toEqual([]);
    });
  });
});