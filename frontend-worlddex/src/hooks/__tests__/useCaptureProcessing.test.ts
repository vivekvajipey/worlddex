import { renderHook, act } from '@testing-library/react-native';
import { useCaptureProcessing } from '../useCaptureProcessing';
import { useImageProcessor } from '../useImageProcessor';
import * as ImageManipulator from 'expo-image-manipulator';
import { Dimensions } from 'react-native';

// Mock dependencies
jest.mock('../useImageProcessor');
jest.mock('expo-image-manipulator');
jest.mock('react-native', () => ({
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 }))
  }
}));

describe('useCaptureProcessing', () => {
  const mockProcessImageForVLM = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useImageProcessor as jest.Mock).mockReturnValue({
      processImageForVLM: mockProcessImageForVLM
    });
  });

  describe('processLassoCapture', () => {
    it('should process lasso capture with correct crop dimensions', async () => {
      const mockCroppedUri = 'file:///cropped.jpg';
      const mockVlmImage = {
        uri: 'file:///processed.jpg',
        width: 512,
        height: 512,
        base64: 'base64data...'
      };

      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
        uri: mockCroppedUri,
        width: 200,
        height: 300
      });
      mockProcessImageForVLM.mockResolvedValue(mockVlmImage);

      const { result } = renderHook(() => useCaptureProcessing());

      const points = [
        { x: 100, y: 200 },
        { x: 200, y: 200 },
        { x: 200, y: 400 },
        { x: 100, y: 400 }
      ];

      let processed: any;
      await act(async () => {
        processed = await result.current.processLassoCapture({
          photoUri: 'file:///original.jpg',
          photoWidth: 1500,
          photoHeight: 3248,
          points
        });
      });

      // Verify crop calculation
      const scaleX = 1500 / 375; // 4
      const expectedCrop = {
        originX: (100 * scaleX) - 10, // 390
        originY: (200 * scaleX) - 10, // 790
        width: (100 * scaleX) + 20, // 420
        height: (200 * scaleX) + 20, // 820
      };

      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        'file:///original.jpg',
        [{
          crop: expectedCrop
        }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );

      expect(processed).toEqual({
        croppedUri: mockCroppedUri,
        vlmImage: mockVlmImage,
        captureBox: expect.objectContaining({
          aspectRatio: expect.any(Number)
        })
      });
    });

    it('should handle points at screen edges', async () => {
      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
        uri: 'file:///cropped.jpg',
        width: 100,
        height: 100
      });
      mockProcessImageForVLM.mockResolvedValue({ base64: 'data' });

      const { result } = renderHook(() => useCaptureProcessing());

      const points = [
        { x: 0, y: 0 },
        { x: 375, y: 0 },
        { x: 375, y: 812 }
      ];

      await act(async () => {
        await result.current.processLassoCapture({
          photoUri: 'file:///original.jpg',
          photoWidth: 1500,
          photoHeight: 3248,
          points
        });
      });

      // Should clamp to photo boundaries
      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({
            crop: expect.objectContaining({
              originX: 0, // Clamped to 0
              originY: 0, // Clamped to 0
            })
          })
        ]),
        expect.any(Object)
      );
    });

    it('should throw error for too small selection', async () => {
      const { result } = renderHook(() => useCaptureProcessing());

      const points = [
        { x: 100, y: 100 },
        { x: 101, y: 100 },
        { x: 101, y: 101 }
      ];

      await expect(
        act(async () => {
          await result.current.processLassoCapture({
            photoUri: 'file:///original.jpg',
            photoWidth: 1500,
            photoHeight: 3248,
            points
          });
        })
      ).rejects.toThrow('Selection area too small');
    });
  });

  describe('processFullScreenCapture', () => {
    it('should process full screen capture without cropping', async () => {
      const mockVlmImage = {
        uri: 'file:///processed.jpg',
        width: 1024,
        height: 1024,
        base64: 'base64data...'
      };

      mockProcessImageForVLM.mockResolvedValue(mockVlmImage);

      const { result } = renderHook(() => useCaptureProcessing());

      let processed: any;
      await act(async () => {
        processed = await result.current.processFullScreenCapture({
          photoUri: 'file:///original.jpg',
          photoWidth: 1500,
          photoHeight: 3248
        });
      });

      // Should not call crop for full screen
      expect(ImageManipulator.manipulateAsync).not.toHaveBeenCalled();

      // Should process the original image
      expect(mockProcessImageForVLM).toHaveBeenCalledWith(
        'file:///original.jpg',
        1500,
        3248
      );

      expect(processed).toEqual({
        croppedUri: 'file:///original.jpg', // Same as input
        vlmImage: mockVlmImage,
        captureBox: {
          x: 37.5, // SCREEN_WIDTH * 0.1
          y: 162.4, // SCREEN_HEIGHT * 0.2
          width: 300, // SCREEN_WIDTH * 0.8
          height: 300, // SCREEN_WIDTH * 0.8
          aspectRatio: 1
        }
      });
    });

    it('should handle VLM processing failure', async () => {
      mockProcessImageForVLM.mockResolvedValue(null);

      const { result } = renderHook(() => useCaptureProcessing());

      let processed: any;
      await act(async () => {
        processed = await result.current.processFullScreenCapture({
          photoUri: 'file:///original.jpg',
          photoWidth: 1500,
          photoHeight: 3248
        });
      });

      expect(processed.vlmImage).toBeNull();
    });
  });
});