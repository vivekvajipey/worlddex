import * as ImageManipulator from "expo-image-manipulator";
import { useCallback } from "react";

const MAX_IMAGE_DIMENSION = 1024; // Max dimension for VLM input
const IMAGE_COMPRESSION_LEVEL = 0.8; // JPEG compression level

export function useImageProcessor() {
  const processImageForVLM = useCallback(
    async (
      uri: string,
      originalWidth: number,
      originalHeight: number
    ): Promise<ImageManipulator.ImageResult | null> => {
      try {
        let resizeWidth = originalWidth;
        let resizeHeight = originalHeight;

        if (
          originalWidth > MAX_IMAGE_DIMENSION ||
          originalHeight > MAX_IMAGE_DIMENSION
        ) {
          if (originalWidth > originalHeight) {
            resizeWidth = MAX_IMAGE_DIMENSION;
            resizeHeight =
              (originalHeight / originalWidth) * MAX_IMAGE_DIMENSION;
          } else {
            resizeHeight = MAX_IMAGE_DIMENSION;
            resizeWidth =
              (originalWidth / originalHeight) * MAX_IMAGE_DIMENSION;
          }
        }

        const manipulatedImage = await ImageManipulator.manipulateAsync(
          uri,
          [
            {
              resize: {
                width: Math.round(resizeWidth),
                height: Math.round(resizeHeight),
              },
            },
          ],
          {
            compress: IMAGE_COMPRESSION_LEVEL,
            format: ImageManipulator.SaveFormat.JPEG,
            base64: true,
          }
        );
        console.log(
          `Image processed for VLM (hook): Original ${originalWidth}x${originalHeight} -> Resized ${Math.round(
            resizeWidth
          )}x${Math.round(resizeHeight)}, New Size: ${
            manipulatedImage.base64
              ? (manipulatedImage.base64.length * 3) / 4 / 1024
              : "N/A"
          } KB`
        );
        return manipulatedImage;
      } catch (error) {
        console.error("Error processing image for VLM (hook):", error);
        return null;
      }
    },
    []
  ); // Empty dependency array as it doesn't depend on component state/props

  return { processImageForVLM };
} 