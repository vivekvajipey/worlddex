import { renderHook, act } from '@testing-library/react-native';
import { useCameraReducer, cameraActions, CameraState, CaptureBox } from '../useCameraReducer';

describe('useCameraReducer', () => {
  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useCameraReducer());
      
      expect(result.current.state).toEqual({
        capture: {
          isCapturing: false,
          uri: null,
          box: {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            aspectRatio: 1
          }
        },
        location: null,
        identification: {
          vlmSuccess: null,
          label: null,
          isComplete: false
        },
        metadata: {
          isPublic: false,
          rarityTier: "common",
          rarityScore: undefined
        }
      });
    });
  });

  describe('Capture Actions', () => {
    it('should handle START_CAPTURE', () => {
      const { result } = renderHook(() => useCameraReducer());
      
      act(() => {
        result.current.dispatch(cameraActions.startCapture());
      });
      
      expect(result.current.isCapturing).toBe(true);
      expect(result.current.capturedUri).toBe(null);
    });

    it('should handle CAPTURE_SUCCESS with uri only', () => {
      const { result } = renderHook(() => useCameraReducer());
      const testUri = 'file://test-image.jpg';
      
      act(() => {
        result.current.dispatch(cameraActions.startCapture());
      });
      
      act(() => {
        result.current.dispatch(cameraActions.captureSuccess(testUri));
      });
      
      expect(result.current.isCapturing).toBe(false);
      expect(result.current.capturedUri).toBe(testUri);
    });

    it('should handle CAPTURE_SUCCESS with uri and box', () => {
      const { result } = renderHook(() => useCameraReducer());
      const testUri = 'file://test-image.jpg';
      const testBox: CaptureBox = {
        x: 100,
        y: 200,
        width: 300,
        height: 400,
        aspectRatio: 0.75
      };
      
      act(() => {
        result.current.dispatch(cameraActions.captureSuccess(testUri, testBox));
      });
      
      expect(result.current.capturedUri).toBe(testUri);
      expect(result.current.captureBox).toEqual(testBox);
    });

    it('should handle CAPTURE_FAILED', () => {
      const { result } = renderHook(() => useCameraReducer());
      
      act(() => {
        result.current.dispatch(cameraActions.startCapture());
      });
      
      act(() => {
        result.current.dispatch(cameraActions.captureFailed());
      });
      
      expect(result.current.isCapturing).toBe(false);
      expect(result.current.capturedUri).toBe(null);
    });

    it('should handle RESET_CAPTURE while preserving box', () => {
      const { result } = renderHook(() => useCameraReducer());
      const testBox: CaptureBox = {
        x: 50,
        y: 50,
        width: 200,
        height: 200,
        aspectRatio: 1
      };
      
      // Set a custom box
      act(() => {
        result.current.dispatch(cameraActions.setCaptureBox(testBox));
      });
      
      // Capture an image
      act(() => {
        result.current.dispatch(cameraActions.captureSuccess('file://test.jpg'));
      });
      
      // Reset capture
      act(() => {
        result.current.dispatch(cameraActions.resetCapture());
      });
      
      expect(result.current.capturedUri).toBe(null);
      expect(result.current.isCapturing).toBe(false);
      expect(result.current.captureBox).toEqual(testBox); // Box should be preserved
    });

    it('should handle SET_CAPTURE_BOX', () => {
      const { result } = renderHook(() => useCameraReducer());
      const testBox: CaptureBox = {
        x: 10,
        y: 20,
        width: 100,
        height: 150,
        aspectRatio: 0.67
      };
      
      act(() => {
        result.current.dispatch(cameraActions.setCaptureBox(testBox));
      });
      
      expect(result.current.captureBox).toEqual(testBox);
    });
  });

  describe('Location Actions', () => {
    it('should handle SET_LOCATION with coordinates', () => {
      const { result } = renderHook(() => useCameraReducer());
      const testLocation = { latitude: 37.7749, longitude: -122.4194 };
      
      act(() => {
        result.current.dispatch(cameraActions.setLocation(testLocation));
      });
      
      expect(result.current.location).toEqual(testLocation);
    });

    it('should handle SET_LOCATION with null', () => {
      const { result } = renderHook(() => useCameraReducer());
      
      // First set a location
      act(() => {
        result.current.dispatch(cameraActions.setLocation({ latitude: 37.7749, longitude: -122.4194 }));
      });
      
      // Then clear it
      act(() => {
        result.current.dispatch(cameraActions.setLocation(null));
      });
      
      expect(result.current.location).toBe(null);
    });
  });

  describe('VLM/Identification Actions', () => {
    it('should handle VLM_PROCESSING_START', () => {
      const { result } = renderHook(() => useCameraReducer());
      
      act(() => {
        result.current.dispatch(cameraActions.vlmProcessingStart());
      });
      
      expect(result.current.vlmSuccess).toBe(null);
      expect(result.current.identifiedLabel).toBe(null);
      expect(result.current.identificationComplete).toBe(false);
    });

    it('should handle VLM_PROCESSING_SUCCESS', () => {
      const { result } = renderHook(() => useCameraReducer());
      const testLabel = 'Golden Retriever';
      
      act(() => {
        result.current.dispatch(cameraActions.vlmProcessingSuccess(testLabel));
      });
      
      expect(result.current.vlmSuccess).toBe(true);
      expect(result.current.identifiedLabel).toBe(testLabel);
    });

    it('should handle VLM_PROCESSING_FAILED', () => {
      const { result } = renderHook(() => useCameraReducer());
      
      act(() => {
        result.current.dispatch(cameraActions.vlmProcessingFailed());
      });
      
      expect(result.current.vlmSuccess).toBe(false);
      expect(result.current.identifiedLabel).toBe(null);
    });

    it('should handle IDENTIFICATION_COMPLETE', () => {
      const { result } = renderHook(() => useCameraReducer());
      
      act(() => {
        result.current.dispatch(cameraActions.identificationComplete());
      });
      
      expect(result.current.identificationComplete).toBe(true);
    });

    it('should handle RESET_IDENTIFICATION', () => {
      const { result } = renderHook(() => useCameraReducer());
      
      // First set some identification state
      act(() => {
        result.current.dispatch(cameraActions.vlmProcessingSuccess('Test Label'));
        result.current.dispatch(cameraActions.identificationComplete());
      });
      
      // Then reset
      act(() => {
        result.current.dispatch(cameraActions.resetIdentification());
      });
      
      expect(result.current.vlmSuccess).toBe(null);
      expect(result.current.identifiedLabel).toBe(null);
      expect(result.current.identificationComplete).toBe(false);
    });
  });

  describe('Metadata Actions', () => {
    it('should handle SET_PUBLIC_STATUS', () => {
      const { result } = renderHook(() => useCameraReducer());
      
      act(() => {
        result.current.dispatch(cameraActions.setPublicStatus(true));
      });
      
      expect(result.current.isCapturePublic).toBe(true);
      
      act(() => {
        result.current.dispatch(cameraActions.setPublicStatus(false));
      });
      
      expect(result.current.isCapturePublic).toBe(false);
    });

    it('should handle SET_RARITY with tier only', () => {
      const { result } = renderHook(() => useCameraReducer());
      
      act(() => {
        result.current.dispatch(cameraActions.setRarity('epic'));
      });
      
      expect(result.current.rarityTier).toBe('epic');
      expect(result.current.rarityScore).toBe(undefined);
    });

    it('should handle SET_RARITY with tier and score', () => {
      const { result } = renderHook(() => useCameraReducer());
      
      act(() => {
        result.current.dispatch(cameraActions.setRarity('legendary', 95.5));
      });
      
      expect(result.current.rarityTier).toBe('legendary');
      expect(result.current.rarityScore).toBe(95.5);
    });

    it('should handle RESET_METADATA', () => {
      const { result } = renderHook(() => useCameraReducer());
      
      // First set some metadata
      act(() => {
        result.current.dispatch(cameraActions.setPublicStatus(true));
        result.current.dispatch(cameraActions.setRarity('mythic', 88));
      });
      
      // Then reset
      act(() => {
        result.current.dispatch(cameraActions.resetMetadata());
      });
      
      expect(result.current.isCapturePublic).toBe(false);
      expect(result.current.rarityTier).toBe('common');
      expect(result.current.rarityScore).toBe(undefined);
    });
  });

  describe('Global Actions', () => {
    it('should handle RESET_ALL', () => {
      const { result } = renderHook(() => useCameraReducer());
      
      // Set various states
      act(() => {
        result.current.dispatch(cameraActions.captureSuccess('file://test.jpg'));
        result.current.dispatch(cameraActions.setLocation({ latitude: 37.7749, longitude: -122.4194 }));
        result.current.dispatch(cameraActions.vlmProcessingSuccess('Test Item'));
        result.current.dispatch(cameraActions.setPublicStatus(true));
        result.current.dispatch(cameraActions.setRarity('rare', 75));
      });
      
      // Reset all
      act(() => {
        result.current.dispatch(cameraActions.resetAll());
      });
      
      // Verify everything is back to initial state
      expect(result.current.state).toEqual({
        capture: {
          isCapturing: false,
          uri: null,
          box: {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            aspectRatio: 1
          }
        },
        location: null,
        identification: {
          vlmSuccess: null,
          label: null,
          isComplete: false
        },
        metadata: {
          isPublic: false,
          rarityTier: "common",
          rarityScore: undefined
        }
      });
    });
  });

  describe('Complex Workflows', () => {
    it('should handle a complete capture flow', () => {
      const { result } = renderHook(() => useCameraReducer());
      
      // 1. Start capture
      act(() => {
        result.current.dispatch(cameraActions.startCapture());
      });
      expect(result.current.isCapturing).toBe(true);
      
      // 2. Set location
      act(() => {
        result.current.dispatch(cameraActions.setLocation({ latitude: 40.7128, longitude: -74.0060 }));
      });
      
      // 3. Capture success
      act(() => {
        result.current.dispatch(cameraActions.captureSuccess('file://capture.jpg'));
      });
      expect(result.current.isCapturing).toBe(false);
      expect(result.current.capturedUri).toBe('file://capture.jpg');
      
      // 4. Start VLM processing
      act(() => {
        result.current.dispatch(cameraActions.vlmProcessingStart());
      });
      
      // 5. VLM success
      act(() => {
        result.current.dispatch(cameraActions.vlmProcessingSuccess('Butterfly'));
      });
      expect(result.current.identifiedLabel).toBe('Butterfly');
      
      // 6. Set metadata
      act(() => {
        result.current.dispatch(cameraActions.setRarity('uncommon', 42));
        result.current.dispatch(cameraActions.setPublicStatus(true));
      });
      
      // 7. Mark identification complete
      act(() => {
        result.current.dispatch(cameraActions.identificationComplete());
      });
      
      // Verify final state
      expect(result.current.capturedUri).toBe('file://capture.jpg');
      expect(result.current.identifiedLabel).toBe('Butterfly');
      expect(result.current.rarityTier).toBe('uncommon');
      expect(result.current.rarityScore).toBe(42);
      expect(result.current.isCapturePublic).toBe(true);
      expect(result.current.identificationComplete).toBe(true);
    });
  });

  describe('Convenience Getters', () => {
    it('should provide all convenience getters', () => {
      const { result } = renderHook(() => useCameraReducer());
      
      // Verify all getters are present and match state
      expect(result.current.isCapturing).toBe(result.current.state.capture.isCapturing);
      expect(result.current.capturedUri).toBe(result.current.state.capture.uri);
      expect(result.current.captureBox).toBe(result.current.state.capture.box);
      expect(result.current.location).toBe(result.current.state.location);
      expect(result.current.vlmSuccess).toBe(result.current.state.identification.vlmSuccess);
      expect(result.current.identifiedLabel).toBe(result.current.state.identification.label);
      expect(result.current.identificationComplete).toBe(result.current.state.identification.isComplete);
      expect(result.current.isCapturePublic).toBe(result.current.state.metadata.isPublic);
      expect(result.current.rarityTier).toBe(result.current.state.metadata.rarityTier);
      expect(result.current.rarityScore).toBe(result.current.state.metadata.rarityScore);
    });
  });
});