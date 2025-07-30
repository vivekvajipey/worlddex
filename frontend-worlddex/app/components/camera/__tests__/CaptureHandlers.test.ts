import { createCaptureHandlers } from '../CaptureHandlers';
import { PostHog } from 'posthog-react-native';
import { waitFor } from '@testing-library/react-native';

// Mock dependencies
const mockDispatch = jest.fn();
const mockActions = {
  resetIdentification: jest.fn(),
  startCapture: jest.fn(),
  vlmProcessingStart: jest.fn(),
  captureSuccess: jest.fn(),
  vlmProcessingFailed: jest.fn(),
  resetCapture: jest.fn(),
  captureFailed: jest.fn(),
  setCaptureBox: jest.fn(),
  identificationComplete: jest.fn(),
  vlmProcessingSuccess: jest.fn(),
  setPublicStatus: jest.fn()
};
const mockIdentify = jest.fn();
const mockUploadPhoto = jest.fn();
const mockCheckCaptureLimit = jest.fn();
const mockIncrementCaptureCount = jest.fn();
const mockProcessLassoCapture = jest.fn();
const mockProcessFullScreenCapture = jest.fn();
const mockHandleFirstCapture = jest.fn();
const mockSaveOfflineCapture = jest.fn();
const mockQueuePostCaptureModals = jest.fn();
const mockSetSavedOffline = jest.fn();
const mockRequestPermission = jest.fn();
const mockPosthog = { capture: jest.fn() } as unknown as PostHog;

const mockCameraRef = {
  current: {
    takePictureAsync: jest.fn()
  }
};

const mockCameraCaptureRef = {
  current: {
    resetLasso: jest.fn(),
    getCameraRef: () => mockCameraRef
  }
};

const mockLastIdentifyPayloadRef = {
  current: null
};

describe('createCaptureHandlers', () => {
  const defaultDeps = {
    dispatch: mockDispatch,
    actions: mockActions,
    location: { latitude: 37.7749, longitude: -122.4194 },
    capturedUri: null,
    captureBox: null,
    rarityTier: 'common',
    identify: mockIdentify,
    uploadPhoto: mockUploadPhoto,
    checkCaptureLimit: mockCheckCaptureLimit,
    incrementCaptureCount: mockIncrementCaptureCount,
    processLassoCapture: mockProcessLassoCapture,
    processFullScreenCapture: mockProcessFullScreenCapture,
    handleFirstCapture: mockHandleFirstCapture,
    saveOfflineCapture: mockSaveOfflineCapture,
    queuePostCaptureModals: mockQueuePostCaptureModals,
    lastIdentifyPayloadRef: mockLastIdentifyPayloadRef as any,
    cameraCaptureRef: mockCameraCaptureRef as any,
    userId: 'test-user',
    savedOffline: false,
    setSavedOffline: mockSetSavedOffline,
    posthog: mockPosthog,
    permission: { granted: true },
    requestPermission: mockRequestPermission
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckCaptureLimit.mockReturnValue(true);
    mockLastIdentifyPayloadRef.current = null;
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
  });

  describe('handleCapture', () => {
    it('should handle successful lasso capture', async () => {
      const photo = { uri: 'photo-uri' };
      const processedData = {
        croppedUri: 'cropped-uri',
        captureBox: { x: 0, y: 0, width: 100, height: 100 },
        vlmImage: { base64: 'base64-data' }
      };

      mockCameraRef.current.takePictureAsync.mockResolvedValue(photo);
      mockProcessLassoCapture.mockResolvedValue(processedData);
      mockUploadPhoto.mockResolvedValue('s3-url');

      const handlers = createCaptureHandlers(defaultDeps);
      const points = [{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 0 }];

      await handlers.handleCapture(points, mockCameraRef as any, 300, 600);

      expect(mockHandleFirstCapture).toHaveBeenCalled();
      expect(mockPosthog.capture).toHaveBeenCalledWith("capture_initiated", { method: "lasso" });
      expect(mockCheckCaptureLimit).toHaveBeenCalled();
      expect(mockActions.resetIdentification).toHaveBeenCalled();
      expect(mockActions.startCapture).toHaveBeenCalled();
      expect(mockActions.vlmProcessingStart).toHaveBeenCalled();
      expect(mockCameraRef.current.takePictureAsync).toHaveBeenCalledWith({
        quality: 1,
        base64: false,
        skipProcessing: false
      });
      expect(mockProcessLassoCapture).toHaveBeenCalledWith({
        photoUri: 'photo-uri',
        points,
        photoWidth: 300,
        photoHeight: 600
      });
      expect(mockActions.captureSuccess).toHaveBeenCalledWith('cropped-uri', processedData.captureBox);
      expect(mockUploadPhoto).toHaveBeenCalledTimes(2);
      expect(mockIdentify).toHaveBeenCalled();
      expect(mockIncrementCaptureCount).toHaveBeenCalled();
    });

    it('should handle capture limit exceeded', async () => {
      mockCheckCaptureLimit.mockReturnValue(false);

      const handlers = createCaptureHandlers(defaultDeps);
      const points = [{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 0 }];

      await handlers.handleCapture(points, mockCameraRef as any, 300, 600);

      expect(mockCameraCaptureRef.current.resetLasso).toHaveBeenCalled();
      expect(mockCameraRef.current.takePictureAsync).not.toHaveBeenCalled();
    });

    it('should handle offline capture', async () => {
      navigator.onLine = false;

      const photo = { uri: 'photo-uri' };
      const processedData = {
        croppedUri: 'cropped-uri',
        captureBox: { x: 0, y: 0, width: 100, height: 100 },
        vlmImage: { base64: 'base64-data' }
      };

      mockCameraRef.current.takePictureAsync.mockResolvedValue(photo);
      mockProcessLassoCapture.mockResolvedValue(processedData);
      mockUploadPhoto.mockResolvedValue('s3-url');

      const handlers = createCaptureHandlers(defaultDeps);
      const points = [{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 0 }];

      await handlers.handleCapture(points, mockCameraRef as any, 300, 600);

      expect(mockSetSavedOffline).toHaveBeenCalledWith(true);
      expect(mockSaveOfflineCapture).toHaveBeenCalledWith({
        capturedUri: 'cropped-uri',
        location: defaultDeps.location,
        captureBox: processedData.captureBox,
        userId: 'test-user',
        method: 'lasso',
        reason: 'offline_detected'
      });
      expect(mockIdentify).not.toHaveBeenCalled();
      expect(mockIncrementCaptureCount).toHaveBeenCalled();
    });

    it('should handle network error during capture', async () => {
      const photo = { uri: 'photo-uri' };
      const processedData = {
        croppedUri: 'cropped-uri',
        captureBox: { x: 0, y: 0, width: 100, height: 100 },
        vlmImage: { base64: 'base64-data' }
      };

      mockCameraRef.current.takePictureAsync.mockResolvedValue(photo);
      mockProcessLassoCapture.mockResolvedValue(processedData);
      mockUploadPhoto.mockResolvedValue('s3-url');
      mockIdentify.mockRejectedValue(new Error('Network request failed'));

      const handlers = createCaptureHandlers({
        ...defaultDeps,
        capturedUri: 'cropped-uri',
        captureBox: processedData.captureBox
      });
      const points = [{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 0 }];

      await handlers.handleCapture(points, mockCameraRef as any, 300, 600);

      expect(mockSetSavedOffline).toHaveBeenCalledWith(true);
      expect(mockSaveOfflineCapture).toHaveBeenCalled();
      expect(mockIncrementCaptureCount).toHaveBeenCalled();
    });
  });

  describe('handleFullScreenCapture', () => {
    it('should handle successful full screen capture', async () => {
      const photo = { uri: 'photo-uri' };
      const processedData = {
        captureBox: { x: 0, y: 0, width: 300, height: 600 },
        vlmImage: { base64: 'base64-data' }
      };

      mockCameraRef.current.takePictureAsync.mockResolvedValue(photo);
      mockProcessFullScreenCapture.mockResolvedValue(processedData);
      mockUploadPhoto.mockResolvedValue('s3-url');

      const handlers = createCaptureHandlers(defaultDeps);

      await handlers.handleFullScreenCapture(300, 600);

      expect(mockActions.resetIdentification).toHaveBeenCalled();
      expect(mockCheckCaptureLimit).toHaveBeenCalled();
      expect(mockActions.startCapture).toHaveBeenCalled();
      expect(mockActions.captureSuccess).toHaveBeenCalledWith('photo-uri');
      expect(mockActions.setCaptureBox).toHaveBeenCalledWith(processedData.captureBox);
      expect(mockIdentify).toHaveBeenCalled();
      await waitFor(() => {
        expect(mockIncrementCaptureCount).toHaveBeenCalled();
      });
    });

    it('should handle offline full screen capture', async () => {
      navigator.onLine = false;

      const photo = { uri: 'photo-uri' };
      const processedData = {
        captureBox: { x: 0, y: 0, width: 300, height: 600 },
        vlmImage: { base64: 'base64-data' }
      };

      mockCameraRef.current.takePictureAsync.mockResolvedValue(photo);
      mockProcessFullScreenCapture.mockResolvedValue(processedData);
      mockUploadPhoto.mockResolvedValue('s3-url');

      const handlers = createCaptureHandlers(defaultDeps);

      await handlers.handleFullScreenCapture(300, 600);

      expect(mockSetSavedOffline).toHaveBeenCalledWith(true);
      expect(mockSaveOfflineCapture).toHaveBeenCalled();
      expect(mockIdentify).not.toHaveBeenCalled();
      expect(mockActions.vlmProcessingSuccess).toHaveBeenCalledWith("");
      expect(mockActions.identificationComplete).toHaveBeenCalled();
    });
  });

  describe('handleRetryIdentification', () => {
    it('should retry identification with saved payload', async () => {
      const mockReset = jest.fn();
      const savedPayload = {
        base64Data: 'base64-data',
        contentType: 'image/jpeg',
        gps: { lat: 37.7749, lng: -122.4194 }
      };
      mockLastIdentifyPayloadRef.current = savedPayload;

      const handlers = createCaptureHandlers(defaultDeps);

      await handlers.handleRetryIdentification(mockReset);

      expect(mockReset).toHaveBeenCalledTimes(2);
      expect(mockActions.resetIdentification).toHaveBeenCalled();
      expect(mockIdentify).toHaveBeenCalledWith(savedPayload);
    });

    it('should handle retry failure', async () => {
      const mockReset = jest.fn();
      const savedPayload = {
        base64Data: 'base64-data',
        contentType: 'image/jpeg',
        gps: null
      };
      mockLastIdentifyPayloadRef.current = savedPayload;
      mockIdentify.mockRejectedValue(new Error('Network error'));

      const handlers = createCaptureHandlers(defaultDeps);

      await handlers.handleRetryIdentification(mockReset);

      expect(mockActions.vlmProcessingFailed).toHaveBeenCalled();
      expect(mockActions.identificationComplete).toHaveBeenCalled();
    });
  });

  describe('dismissPolaroid', () => {
    it('should queue modals for successful identification', () => {
      const handlers = createCaptureHandlers(defaultDeps);

      handlers.dismissPolaroid(true, 'capture-uri', true, 'Test Object', true);

      expect(mockQueuePostCaptureModals).toHaveBeenCalledWith({
        itemName: 'Test Object',
        captureId: 'capture-uri',
        userId: 'test-user',
        rarityTier: 'common'
      });
      expect(mockActions.captureFailed).toHaveBeenCalled();
      expect(mockActions.resetCapture).toHaveBeenCalled();
      expect(mockActions.resetIdentification).toHaveBeenCalled();
      expect(mockActions.setPublicStatus).toHaveBeenCalledWith(true);
      expect(mockCameraCaptureRef.current.resetLasso).toHaveBeenCalled();
      expect(mockSetSavedOffline).toHaveBeenCalledWith(false);
    });

    it('should not queue modals for offline saves', () => {
      const handlers = createCaptureHandlers({ ...defaultDeps, savedOffline: true });

      handlers.dismissPolaroid(true, 'capture-uri', true, 'Test Object', true);

      expect(mockQueuePostCaptureModals).not.toHaveBeenCalled();
    });
  });
});