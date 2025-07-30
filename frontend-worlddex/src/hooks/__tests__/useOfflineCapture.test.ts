import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useOfflineCapture } from '../useOfflineCapture';
import { OfflineCaptureService } from '../../services/offlineCaptureService';
import { useAlert } from '../../contexts/AlertContext';
import { usePostHog } from 'posthog-react-native';

// Mock dependencies
jest.mock('../../services/offlineCaptureService');
jest.mock('../../contexts/AlertContext');
jest.mock('posthog-react-native');

describe('useOfflineCapture', () => {
  const mockShowAlert = jest.fn();
  const mockCapture = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAlert as jest.Mock).mockReturnValue({ showAlert: mockShowAlert });
    (usePostHog as jest.Mock).mockReturnValue({ capture: mockCapture });
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useOfflineCapture());

    expect(result.current.savedOffline).toBe(false);
    expect(typeof result.current.setSavedOffline).toBe('function');
    expect(typeof result.current.saveOfflineCapture).toBe('function');
    expect(typeof result.current.initializeOfflineService).toBe('function');
  });

  it('should initialize offline service', async () => {
    const { result } = renderHook(() => useOfflineCapture());

    act(() => {
      result.current.initializeOfflineService('user-123');
    });

    expect(OfflineCaptureService.initialize).toHaveBeenCalledWith('user-123');
  });

  it('should save offline capture successfully', async () => {
    const mockLocalUri = 'file:///local/image.jpg';
    (OfflineCaptureService.saveImageLocally as jest.Mock).mockResolvedValue(mockLocalUri);
    (OfflineCaptureService.savePendingCapture as jest.Mock).mockResolvedValue({});

    const { result } = renderHook(() => useOfflineCapture());

    const captureParams = {
      capturedUri: 'file:///temp/image.jpg',
      location: { latitude: 37.7749, longitude: -122.4194 },
      captureBox: { x: 10, y: 20, width: 100, height: 100, aspectRatio: 1 },
      userId: 'user-123',
      method: 'lasso' as const,
      reason: 'network_error'
    };

    await act(async () => {
      await result.current.saveOfflineCapture(captureParams);
    });

    expect(OfflineCaptureService.saveImageLocally).toHaveBeenCalledWith(
      'file:///temp/image.jpg',
      'user-123'
    );

    expect(OfflineCaptureService.savePendingCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        imageUri: mockLocalUri,
        location: captureParams.location,
        captureBox: captureParams.captureBox
      }),
      'user-123'
    );

    expect(mockCapture).toHaveBeenCalledWith('offline_capture_saved', {
      method: 'lasso',
      reason: 'network_error'
    });
  });

  it('should show alert on auto_dismiss method', async () => {
    (OfflineCaptureService.saveImageLocally as jest.Mock).mockResolvedValue('file:///local/image.jpg');
    (OfflineCaptureService.savePendingCapture as jest.Mock).mockResolvedValue({});

    const { result } = renderHook(() => useOfflineCapture());

    await act(async () => {
      await result.current.saveOfflineCapture({
        capturedUri: 'file:///temp/image.jpg',
        captureBox: { x: 0, y: 0, width: 100, height: 100, aspectRatio: 1 },
        userId: 'user-123',
        method: 'auto_dismiss',
        reason: 'network_unavailable'
      });
    });

    // Wait for the setTimeout
    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith({
        title: "Saved for Later",
        message: "We'll identify your capture when you're back online.",
        icon: "save-outline",
        iconColor: "#10B981"
      });
    }, { timeout: 400 });
  });

  it('should handle save errors gracefully', async () => {
    const error = new Error('Storage full');
    (OfflineCaptureService.saveImageLocally as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useOfflineCapture());

    await expect(
      act(async () => {
        await result.current.saveOfflineCapture({
          capturedUri: 'file:///temp/image.jpg',
          captureBox: { x: 0, y: 0, width: 100, height: 100, aspectRatio: 1 },
          userId: 'user-123',
          method: 'lasso',
          reason: 'network_error'
        });
      })
    ).rejects.toThrow('Storage full');

    expect(mockShowAlert).toHaveBeenCalledWith({
      title: "Error",
      message: "Failed to save capture. Please try again.",
      icon: "alert-circle-outline",
      iconColor: "#EF4444"
    });
  });

  it('should prevent duplicate saves', async () => {
    (OfflineCaptureService.saveImageLocally as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve('file:///local/image.jpg'), 100))
    );

    const { result } = renderHook(() => useOfflineCapture());

    // Start two saves simultaneously
    const save1 = result.current.saveOfflineCapture({
      capturedUri: 'file:///temp/image1.jpg',
      captureBox: { x: 0, y: 0, width: 100, height: 100, aspectRatio: 1 },
      userId: 'user-123',
      method: 'lasso',
      reason: 'network_error'
    });

    const save2 = result.current.saveOfflineCapture({
      capturedUri: 'file:///temp/image2.jpg',
      captureBox: { x: 0, y: 0, width: 100, height: 100, aspectRatio: 1 },
      userId: 'user-123',
      method: 'lasso',
      reason: 'network_error'
    });

    await act(async () => {
      await Promise.all([save1, save2]);
    });

    // Only the first save should have proceeded
    expect(OfflineCaptureService.saveImageLocally).toHaveBeenCalledTimes(1);
  });
});