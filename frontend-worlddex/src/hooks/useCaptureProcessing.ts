import { useState, useCallback } from 'react';
import { Dimensions } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { useImageProcessor } from './useImageProcessor';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CaptureBox {
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio: number;
}

interface ProcessedCapture {
  croppedUri: string;
  vlmImage: {
    uri: string;
    width: number;
    height: number;
    base64: string;
  } | null;
  captureBox: CaptureBox;
}

interface UseCaptureProcessingReturn {
  processLassoCapture: (params: {
    photoUri: string;
    photoWidth: number;
    photoHeight: number;
    points: { x: number; y: number }[];
  }) => Promise<ProcessedCapture>;
  processFullScreenCapture: (params: {
    photoUri: string;
    photoWidth: number;
    photoHeight: number;
  }) => Promise<ProcessedCapture>;
}

export const useCaptureProcessing = (): UseCaptureProcessingReturn => {
  const { processImageForVLM } = useImageProcessor();

  const processLassoCapture = useCallback(async ({
    photoUri,
    photoWidth,
    photoHeight,
    points
  }: {
    photoUri: string;
    photoWidth: number;
    photoHeight: number;
    points: { x: number; y: number }[];
  }): Promise<ProcessedCapture> => {
    // Calculate the image scale factor (photo dimensions vs screen dimensions)
    const scaleX = photoWidth / SCREEN_WIDTH;
    const scaleY = photoHeight / SCREEN_HEIGHT;

    // Calculate bounding box of the selection, scaling coordinates to match the photo
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const point of points) {
      // Scale screen coordinates to photo coordinates
      const scaledX = point.x * scaleX;
      const scaledY = point.y * scaleY;

      minX = Math.min(minX, scaledX);
      minY = Math.min(minY, scaledY);
      maxX = Math.max(maxX, scaledX);
      maxY = Math.max(maxY, scaledY);
    }

    // Add padding
    const padding = 10;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(photoWidth, maxX + padding);
    maxY = Math.min(photoHeight, maxY + padding);

    // Calculate crop dimensions
    const cropWidth = maxX - minX;
    const cropHeight = maxY - minY;
    const aspectRatio = cropWidth / cropHeight;

    // Create capture box for animation
    const captureBox: CaptureBox = {
      x: minX / scaleX,
      y: minY / scaleY,
      width: cropWidth / scaleX,
      height: cropHeight / scaleY,
      aspectRatio
    };

    if (cropWidth < 5 || cropHeight < 5) {
      throw new Error("Selection area too small");
    }

    // Crop the image
    const cropResult = await ImageManipulator.manipulateAsync(
      photoUri,
      [
        {
          crop: {
            originX: minX,
            originY: minY,
            width: cropWidth,
            height: cropHeight,
          },
        },
      ],
      { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
    );

    // Process for VLM
    const vlmImage = await processImageForVLM(cropResult.uri, cropResult.width, cropResult.height);

    return {
      croppedUri: cropResult.uri,
      vlmImage,
      captureBox
    };
  }, [processImageForVLM, SCREEN_WIDTH, SCREEN_HEIGHT]);

  const processFullScreenCapture = useCallback(async ({
    photoUri,
    photoWidth,
    photoHeight
  }: {
    photoUri: string;
    photoWidth: number;
    photoHeight: number;
  }): Promise<ProcessedCapture> => {
    // Set full screen capture box dimensions for polaroid animation
    const captureBox: CaptureBox = {
      x: SCREEN_WIDTH * 0.1,
      y: SCREEN_HEIGHT * 0.2,
      width: SCREEN_WIDTH * 0.8,
      height: SCREEN_WIDTH * 0.8,
      aspectRatio: 1
    };

    // Process for VLM (no cropping needed for full screen)
    const vlmImage = await processImageForVLM(photoUri, photoWidth, photoHeight);

    return {
      croppedUri: photoUri, // Use original for full screen
      vlmImage,
      captureBox
    };
  }, [processImageForVLM, SCREEN_WIDTH, SCREEN_HEIGHT]);

  return {
    processLassoCapture,
    processFullScreenCapture
  };
};