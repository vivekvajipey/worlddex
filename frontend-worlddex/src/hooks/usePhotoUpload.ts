import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { createCapture } from "../../database/hooks/useCaptures";
import { getUploadUrl } from "../api/s3";
import type { Capture } from "../../database/types";
import * as ImageManipulator from "expo-image-manipulator";

interface UsePhotoUploadReturn {
  uploadCapturePhoto: (
    fileUri: string,
    contentType: string,
    fileName: string,
    captureData: Omit<Capture, "id" | "captured_at" | "segmented_image_key" | "thumb_key">
  ) => Promise<Capture>;
  uploadPhoto: (
    fileUri: string,
    contentType: string,
    fileName: string,
    folder?: string
  ) => Promise<string>;
  isUploading: boolean;
  error: Error | null;
  reset: () => void;
}

export const usePhotoUpload = (): UsePhotoUploadReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reset = () => {
    setError(null);
    setIsUploading(false);
  };

  // Generic photo upload function that just uploads to S3
  const uploadPhoto = async (
    fileUri: string,
    contentType: string,
    fileName: string,
    folder: string = "uploads"
  ): Promise<string> => {
    try {
      setIsUploading(true);
      setError(null);

      // Generate a unique S3 key
      const key = `${folder}/${uuidv4()}-${fileName}`;

      // Get signed upload URL for S3
      const { uploadUrl } = await getUploadUrl(key, contentType);

      // Fetch and upload file directly to S3
      const fileResponse = await fetch(fileUri);
      const blob = await fileResponse.blob();
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: blob,
      });

      if (!putRes.ok) throw new Error("S3 upload failed");

      return key; // Return the S3 key
    } catch (err) {
      const errObj = err instanceof Error ? err : new Error(String(err));
      setError(errObj);
      throw errObj;
    } finally {
      setIsUploading(false);
    }
  };

  // Original function renamed to uploadCapturePhoto
  const uploadCapturePhoto = async (
    fileUri: string,
    contentType: string,
    fileName: string,
    captureData: Omit<Capture, "id" | "captured_at" | "segmented_image_key" | "thumb_key">
  ): Promise<Capture> => {
    try {
      setIsUploading(true);
      setError(null);

      // Generate a unique S3 key
      const key = `${captureData.user_id}/${
        captureData.item_id
      }/${uuidv4()}-${fileName}`;
      
      // Generate thumb key - use similar pattern as proposed in backend
      const thumbKey = key.replace(/^.*\/([^\/]+)$/, 'thumbs/$1').replace(/\.(png|jpe?g)$/i, '.jpg');

      // 1. Create thumbnail image using ImageManipulator
      const thumbnailResult = await ImageManipulator.manipulateAsync(
        fileUri,
        [{ resize: { width: 200 } }],
        { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
      );

      // 2. Upload original image
      console.log("Uploading original image...");
      // Get signed upload URL for S3
      const { uploadUrl } = await getUploadUrl(key, contentType);

      // Fetch and upload original file directly to S3
      const originalFileResponse = await fetch(fileUri);
      const originalBlob = await originalFileResponse.blob();
      const originalPutRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: originalBlob,
      });

      if (!originalPutRes.ok) throw new Error("Original image S3 upload failed");

      // 3. Upload thumbnail image
      console.log("Uploading thumbnail image...");
      let thumbSuccess = false;

      try {
        // Get signed upload URL for thumbnail
        const { uploadUrl: thumbUploadUrl } = await getUploadUrl(thumbKey, "image/jpeg");

        // Fetch and upload thumbnail file directly to S3
        const thumbFileResponse = await fetch(thumbnailResult.uri);
        const thumbBlob = await thumbFileResponse.blob();
        const thumbPutRes = await fetch(thumbUploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "image/jpeg" },
          body: thumbBlob,
        });

        thumbSuccess = thumbPutRes.ok;
      } catch (thumbErr) {
        console.error("Thumbnail upload failed:", thumbErr);
        // Continue with main capture creation even if thumbnail fails
      }

      // 4. Insert Supabase row and get back capture
      const created = await createCapture({
        ...captureData,
        image_key: key,
        segmented_image_key: "",
        thumb_key: thumbSuccess ? thumbKey : undefined,
      });
      
      if (!created) throw new Error("Failed to create capture row");
      return created;
    } catch (err) {
      const errObj = err instanceof Error ? err : new Error(String(err));
      setError(errObj);
      throw errObj;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadCapturePhoto, uploadPhoto, isUploading, error, reset };
};
