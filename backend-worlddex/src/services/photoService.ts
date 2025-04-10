import { S3Service } from './s3Service';
import { PhotoUpload, PhotoUploadResponse } from '../../../shared/types/photo';
import { AWS_CONFIG } from '../config/aws';

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

    const buffer = Buffer.from(photo.base64Data, 'base64');
    
    // Generate a unique key for the photo
    const key = `photos/${Date.now()}-${photo.fileName}`;
    
    // Upload to S3
    const result = await this.s3Service.uploadFile(
      key,
      buffer,
      photo.contentType
    );

    return {
      url: result.url,
      key: result.key
    };
  }
} 