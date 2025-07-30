import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { CameraEffects } from '../CameraEffects';
import * as Location from 'expo-location';

// Mock expo-location
jest.mock('expo-location', () => ({
  getCurrentPositionAsync: jest.fn(),
  Accuracy: {
    High: 5
  }
}));

describe('CameraEffects', () => {
  const mockDispatch = jest.fn();
  const mockActions = {
    setLocation: jest.fn(),
    resetIdentification: jest.fn(),
    resetMetadata: jest.fn(),
    vlmProcessingStart: jest.fn(),
    vlmProcessingSuccess: jest.fn(),
    vlmProcessingFailed: jest.fn(),
    identificationComplete: jest.fn(),
    captureFailed: jest.fn(),
    setRarity: jest.fn()
  };
  const mockInitializeOfflineService = jest.fn();
  const mockSyncWithDatabase = jest.fn();
  const mockSaveOfflineCapture = jest.fn();
  const mockSetSavedOffline = jest.fn();
  const mockCameraCaptureRef = { current: { resetLasso: jest.fn() } };

  const defaultProps = {
    dispatch: mockDispatch,
    actions: mockActions,
    isCapturing: false,
    capturedUri: null,
    captureBox: null,
    location: null,
    rarityTier: 'common',
    tier1: null,
    tier2: null,
    idLoading: false,
    idError: null,
    userId: 'test-user',
    initializeOfflineService: mockInitializeOfflineService,
    syncWithDatabase: mockSyncWithDatabase,
    saveOfflineCapture: mockSaveOfflineCapture,
    setSavedOffline: mockSetSavedOffline,
    savedOffline: false,
    locationPermission: null,
    cameraCaptureRef: mockCameraCaptureRef as any,
    isShowingModal: false,
    currentModal: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render without crashing', () => {
    const { toJSON } = render(<CameraEffects {...defaultProps} />);
    expect(toJSON()).toBeNull(); // Component doesn't render anything
  });

  it('should initialize offline service when userId is provided', () => {
    render(<CameraEffects {...defaultProps} />);
    
    expect(mockInitializeOfflineService).toHaveBeenCalledWith('test-user');
    expect(mockSyncWithDatabase).toHaveBeenCalled();
  });

  it('should not initialize offline service when userId is null', () => {
    render(<CameraEffects {...defaultProps} userId={null} />);
    
    expect(mockInitializeOfflineService).not.toHaveBeenCalled();
    expect(mockSyncWithDatabase).not.toHaveBeenCalled();
  });

  it('should fetch location when permission is granted', async () => {
    const mockLocation = {
      coords: {
        latitude: 37.7749,
        longitude: -122.4194
      }
    };
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(mockLocation);

    render(
      <CameraEffects
        {...defaultProps}
        locationPermission={{ granted: true } as any}
      />
    );

    await waitFor(() => {
      expect(Location.getCurrentPositionAsync).toHaveBeenCalledWith({
        accuracy: Location.Accuracy.High
      });
      expect(mockActions.setLocation).toHaveBeenCalledWith({
        latitude: 37.7749,
        longitude: -122.4194
      });
    });
  });

  it('should handle location fetch error', async () => {
    (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(new Error('Location error'));

    render(
      <CameraEffects
        {...defaultProps}
        locationPermission={{ granted: true } as any}
      />
    );

    await waitFor(() => {
      expect(mockActions.setLocation).toHaveBeenCalledWith(null);
    });
  });

  it('should save offline capture on network error', async () => {
    mockSaveOfflineCapture.mockResolvedValue(undefined);

    render(
      <CameraEffects
        {...defaultProps}
        isCapturing={true}
        capturedUri="test-uri"
        idError={{ message: 'Network request failed' }}
        location={{ latitude: 37.7749, longitude: -122.4194 }}
        captureBox={{ x: 0, y: 0, width: 100, height: 100 }}
      />
    );

    await waitFor(() => {
      expect(mockSetSavedOffline).toHaveBeenCalledWith(true);
      expect(mockActions.vlmProcessingStart).toHaveBeenCalled();
      expect(mockSaveOfflineCapture).toHaveBeenCalledWith({
        capturedUri: 'test-uri',
        location: { latitude: 37.7749, longitude: -122.4194 },
        captureBox: { x: 0, y: 0, width: 100, height: 100 },
        userId: 'test-user',
        method: 'auto_dismiss',
        reason: 'network_error'
      });
      expect(mockCameraCaptureRef.current.resetLasso).toHaveBeenCalled();
    });
  });

  it('should reset capture state if stuck in capturing state', async () => {
    jest.useFakeTimers();

    const { rerender } = render(
      <CameraEffects
        {...defaultProps}
        isCapturing={true}
        capturedUri={null}
      />
    );

    // Fast forward past the timeout
    jest.advanceTimersByTime(5001);

    await waitFor(() => {
      expect(mockActions.captureFailed).toHaveBeenCalled();
      expect(mockCameraCaptureRef.current.resetLasso).toHaveBeenCalled();
    });

    jest.useRealTimers();
  });

  it('should handle tier1 results', () => {
    const tier1Result = {
      label: 'Test Object',
      rarityTier: 'rare' as const,
      rarityScore: 0.8
    };

    render(
      <CameraEffects
        {...defaultProps}
        tier1={tier1Result}
      />
    );

    expect(mockActions.vlmProcessingSuccess).toHaveBeenCalledWith('Test Object');
    expect(mockActions.setRarity).toHaveBeenCalledWith('rare');
    expect(mockActions.setRarity).toHaveBeenCalledWith('rare', 0.8);
    expect(mockActions.identificationComplete).toHaveBeenCalled();
  });

  it('should handle tier2 results', () => {
    const tier1Result = { label: 'Test Object' };
    const tier2Result = { label: 'Detailed Test Object', provider: 'test', confidence: 0.9 };

    render(
      <CameraEffects
        {...defaultProps}
        tier1={tier1Result}
        tier2={tier2Result}
        idLoading={false}
      />
    );

    expect(mockActions.identificationComplete).toHaveBeenCalled();
    expect(mockActions.vlmProcessingSuccess).toHaveBeenCalledWith('Detailed Test Object');
  });

  it('should reset identification when tier1 and tier2 are null', () => {
    render(
      <CameraEffects
        {...defaultProps}
        tier1={null}
        tier2={null}
      />
    );

    expect(mockActions.resetIdentification).toHaveBeenCalled();
    expect(mockActions.resetMetadata).toHaveBeenCalled();
  });

  it('should handle tier1 with no label', () => {
    const tier1Result = { label: null };

    render(
      <CameraEffects
        {...defaultProps}
        tier1={tier1Result}
      />
    );

    expect(mockActions.vlmProcessingSuccess).not.toHaveBeenCalled();
    expect(mockActions.identificationComplete).not.toHaveBeenCalled();
  });
});