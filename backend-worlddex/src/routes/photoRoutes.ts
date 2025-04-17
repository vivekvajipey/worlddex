import { Router, RequestHandler } from 'express';
import { PhotoService } from '../services/photoService';
import { PhotoUpload, PhotoUploadResponse, UploadUrlRequest, UploadUrlResponse, DownloadUrlResponse, DownloadUrlsRequest, DownloadUrlsResponse } from '../../shared/types/photo';

const router = Router();
const photoService = new PhotoService();

interface ErrorResponse {
  error: string;
}

const uploadHandler: RequestHandler = async (req, res) => {
  try {
    const photoData = req.body as PhotoUpload;
    
    // Basic validation
    if (!photoData.base64Data || !photoData.fileName || !photoData.contentType) {
      res.status(400).json({ error: 'Missing required photo data' } as ErrorResponse);
      return;
    }

    const result = await photoService.uploadPhoto(photoData);
    res.json(result);
    return;
  } catch (error) {
    console.error('Photo upload error:', error);
    res.status(500).json({ error: 'Failed to upload photo' } as ErrorResponse);
    return;
  }
};

// Return a presigned S3 PUT URL for clients to upload directly
const uploadUrlHandler: RequestHandler = async (req, res) => {
  try {
    const { key, contentType } = req.body as UploadUrlRequest;
    if (!key || !contentType) {
      res.status(400).json({ error: 'Missing key or contentType' } as ErrorResponse);
      return;
    }
    const result = await photoService.getUploadUrl(key, contentType);
    res.json(result as UploadUrlResponse);
  } catch (error) {
    console.error('Error getting upload URL:', error);
    res.status(500).json({ error: 'Failed to get upload URL' } as ErrorResponse);
  }
};

// Return a presigned S3 GET URL for clients to download directly
const downloadUrlHandler: RequestHandler = async (req, res) => {
  try {
    const key = req.params.key;
    if (!key) {
      res.status(400).json({ error: 'Missing key in params' } as ErrorResponse);
      return;
    }
    const result = await photoService.getDownloadUrl(key);
    res.json(result as DownloadUrlResponse);
  } catch (error) {
    console.error('Error getting download URL:', error);
    res.status(500).json({ error: 'Failed to get download URL' } as ErrorResponse);
  }
};

// Batch endpoint: return presigned GET URLs for multiple keys
const downloadUrlsHandler: RequestHandler = async (req, res) => {
  try {
    const { keys } = req.body as DownloadUrlsRequest;
    if (!Array.isArray(keys) || keys.some(k => typeof k !== 'string')) {
      res.status(400).json({ error: 'Invalid keys array' } as ErrorResponse);
      return;
    }
    const items = await Promise.all(
      keys.map(async (key) => {
        const { downloadUrl } = await photoService.getDownloadUrl(key);
        return { key, downloadUrl };
      })
    );
    res.json(items as DownloadUrlsResponse);
  } catch (error) {
    console.error('Error getting batch download URLs:', error);
    res.status(500).json({ error: 'Failed to get batch download URLs' } as ErrorResponse);
  }
};

router.post('/upload', uploadHandler);
router.post('/upload-url', uploadUrlHandler);
router.get('/:key/download-url', downloadUrlHandler);
router.post('/download-urls', downloadUrlsHandler);

export default router; 