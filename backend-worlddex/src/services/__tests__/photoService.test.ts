import { PhotoService } from '../photoService';
import { PhotoUpload } from '../../../../shared/types/photo';
import { describe, expect, it, beforeEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';

describe('PhotoService', () => {
  let photoService: PhotoService;

  beforeEach(() => {
    photoService = new PhotoService();
  });

  describe('uploadPhoto', () => {
    it('should successfully upload a photo', async () => {
      // Read a test image file and convert to base64
      const imagePath = path.join(__dirname, 'fixtures', 'test-image.jpg');
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Data = imageBuffer.toString('base64');

      const photoData: PhotoUpload = {
        base64Data,
        fileName: 'test-upload.jpg',
        contentType: 'image/jpeg'
      };

      const result = await photoService.uploadPhoto(photoData);

      // Check the response has the expected shape
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('key');
      expect(result.url).toContain('amazonaws.com');
      expect(result.key).toContain('photos/');
      expect(result.key).toContain('test-upload.jpg');
    });

    it('should throw an error for invalid base64 data', async () => {
      const photoData: PhotoUpload = {
        base64Data: 'invalid-base64',
        fileName: 'test.jpg',
        contentType: 'image/jpeg'
      };

      await expect(photoService.uploadPhoto(photoData))
        .rejects
        .toThrow();
    });
  });
}); 