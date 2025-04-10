import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { Readable } from 'stream';
import { S3Service } from '../s3Service';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { Readable as ReadableStream } from 'stream';
import { SdkStreamMixin } from '@aws-sdk/types';

// Mock the getSignedUrl function
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockImplementation(async () => 'https://fake-signed-url.com/test.jpg')
}));

// Create a mock S3 client
const s3Mock = mockClient(S3Client);

// Helper to create a mock stream that matches AWS SDK's type
const createMockBody = (content: string) => {
  const buffer = Buffer.from(content);
  return {
    transformToString: async () => content,
    transformToByteArray: async () => new Uint8Array(buffer),
    stream: () => Readable.from(buffer),
    size: buffer.length,
    type: 'application/octet-stream'
  } as unknown as (Blob & SdkStreamMixin);
};

describe('S3Service', () => {
  const bucket = 'test-bucket';
  let s3Service: S3Service;

  beforeEach(() => {
    // Reset all mocks before each test
    s3Mock.reset();
    s3Service = new S3Service(bucket);
  });

  describe('uploadFile', () => {
    it('should successfully upload a file', async () => {
      // Mock the S3 client response
      s3Mock.on(PutObjectCommand).resolves({});

      const testFile = Buffer.from('test content');
      const result = await s3Service.uploadFile(
        'test-key.txt',
        testFile,
        'text/plain'
      );

      // Verify the result
      expect(result).toEqual({
        key: 'test-key.txt',
        contentType: 'text/plain',
        url: 'https://fake-signed-url.com/test.jpg',
      });

      // Verify the S3 client was called with correct parameters
      const calls = s3Mock.calls();
      expect(calls).toHaveLength(1);
      expect(calls[0].args[0].input).toEqual({
        Bucket: bucket,
        Key: 'test-key.txt',
        Body: testFile,
        ContentType: 'text/plain',
        Metadata: undefined,
      });

      // Verify getSignedUrl was called
      expect(getSignedUrl).toHaveBeenCalled();
    });

    it('should handle upload errors', async () => {
      // Mock an error response
      s3Mock.on(PutObjectCommand).rejects(new Error('Upload failed'));

      await expect(
        s3Service.uploadFile('test-key.txt', Buffer.from('test'), 'text/plain')
      ).rejects.toThrow('Upload failed');
    });
  });

  describe('getFile', () => {
    it('should successfully get a file', async () => {
      const mockContent = 'test content';
      
      // Create a mock response that matches AWS SDK's structure
      s3Mock.on(GetObjectCommand).resolves({
        $metadata: {},
        Body: createMockBody(mockContent),
        ContentType: 'text/plain',
        Metadata: { test: 'metadata' },
      });

      const result = await s3Service.getFile('test-key.txt');

      expect(result).toEqual({
        content: Buffer.from(mockContent),
        contentType: 'text/plain',
        metadata: { test: 'metadata' },
      });
    });
  });
}); 