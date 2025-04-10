import { Router, RequestHandler } from 'express';
import { PhotoService } from '../services/photoService';
import { PhotoUpload, PhotoUploadResponse } from '../../../shared/types/photo';

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

router.post('/upload', uploadHandler);

export default router; 