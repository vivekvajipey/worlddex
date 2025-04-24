import { S3Service } from './s3Service';
import { PhotoUpload, PhotoUploadResponse, UploadUrlResponse, DownloadUrlResponse } from '../../shared/types/photo';
import { AWS_CONFIG } from '../config/aws';
import sharp from 'sharp';

export class PhotoService {
  private s3Service: S3Service;
  
  constructor() {
    this.s3Service = new S3Service(AWS_CONFIG.bucket);
  }

  private isValidBase64(str: string): boolean {
    try {
      return Buffer.from(str, 'base64').toString('base64') === str;
    } catch {
      return false;
    }
  }

  async uploadPhoto(photo: PhotoUpload): Promise<PhotoUploadResponse> {
    if (!this.isValidBase64(photo.base64Data)) {
      throw new Error('Invalid base64 data');
    }

    /* 1️⃣ decode base64 */
    const buffer = Buffer.from(photo.base64Data, 'base64');
    
    /* 2️⃣ derive keys */
    const originalKey = `photos/${Date.now()}-${photo.fileName}`;
    const thumbKey = originalKey.replace(/^photos\//, 'thumbs/').replace(/\.(png|jpe?g)$/i, '.jpg');

    /* 3️⃣ async-parallel uploads */
    const [originalResult, _] = await Promise.all([
      this.s3Service.uploadFile(originalKey, buffer, photo.contentType),
      sharp(buffer)
        .resize({ width: 200 })
        .jpeg({ mozjpeg: true, quality: 75 })
        .toBuffer()
        .then(tb => this.s3Service.uploadFile(thumbKey, tb, 'image/jpeg'))
    ]);

    /* 4️⃣ return both keys */
    return {
      url: originalResult.url,
      key: originalResult.key,
      thumbKey: thumbKey
    };
  }

  /**
   * Get a presigned PUT URL for direct S3 uploads
   */
  async getUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 300
  ): Promise<UploadUrlResponse> {
    const uploadUrl = await this.s3Service.getSignedPutUrl(key, contentType, expiresIn);
    return { uploadUrl, key };
  }

  /**
   * Get a presigned GET URL for direct S3 downloads
   */
  async getDownloadUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<DownloadUrlResponse> {
    const downloadUrl = await this.s3Service.getSignedUrl(key, expiresIn);
    return { downloadUrl };
  }
} 