import { 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  S3ServiceException
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from '../config/aws';
import { UploadResponse, GetFileResponse, S3Error } from '../types/s3.types';

export class S3Service {
  constructor(private readonly bucket: string) {
    if (!bucket) {
      throw new Error('S3 bucket name is required');
    }
  }

  async uploadFile(
    key: string, 
    body: Buffer, 
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<UploadResponse> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        Metadata: metadata,
      });

      await s3Client.send(command);
      
      // Generate a signed URL for the uploaded file
      const url = await this.getSignedUrl(key);

      return {
        key,
        url,
        contentType,
      };
    } catch (error) {
      if (error instanceof S3ServiceException) {
        throw new S3Error(`Failed to upload file: ${error.message}`, error.name);
      }
      throw error;
    }
  }

  async getFile(key: string): Promise<GetFileResponse> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await s3Client.send(command);
      
      if (!response.Body) {
        throw new S3Error('File content is empty');
      }

      // Convert the response body to a buffer
      const content = await response.Body.transformToByteArray().then(arr => Buffer.from(arr));

      return {
        content,
        contentType: response.ContentType || 'application/octet-stream',
        metadata: response.Metadata,
      };
    } catch (error) {
      if (error instanceof S3ServiceException) {
        throw new S3Error(`Failed to get file: ${error.message}`, error.name);
      }
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await s3Client.send(command);
    } catch (error) {
      if (error instanceof S3ServiceException) {
        throw new S3Error(`Failed to delete file: ${error.message}`, error.name);
      }
      throw error;
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await s3Client.send(command);
      return true;
    } catch (error) {
      if (error instanceof S3ServiceException && error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(s3Client, command, { expiresIn });
  }
} 