import { S3Service } from '../s3Service';
import { AWS_CONFIG } from '../../config/aws';
import { describe, expect, it, beforeAll } from '@jest/globals';

// Only run these tests if we have AWS credentials
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';

// Integration tests use real AWS
(runIntegrationTests ? describe : describe.skip)('S3Service Integration Tests', () => {
  const testBucket = AWS_CONFIG.bucket;
  let s3Service: S3Service;
  
  beforeAll(() => {
    s3Service = new S3Service(testBucket);
  });

  it('should upload and then download a file', async () => {
    const testContent = 'test content ' + Date.now(); // Make it unique
    const testKey = `test-${Date.now()}.txt`;
    
    // Upload
    const uploadResult = await s3Service.uploadFile(
      testKey,
      Buffer.from(testContent),
      'text/plain'
    );

    expect(uploadResult.key).toBe(testKey);
    expect(uploadResult.url).toContain(testKey);

    // Download and verify
    const downloadResult = await s3Service.getFile(testKey);
    expect(downloadResult.content.toString()).toBe(testContent);
    expect(downloadResult.contentType).toBe('text/plain');

    // Cleanup
    await s3Service.deleteFile(testKey);
  }, 30000); // Longer timeout for real AWS calls

  it('should handle non-existent files', async () => {
    const nonExistentKey = `non-existent-${Date.now()}.txt`;
    
    await expect(
      s3Service.getFile(nonExistentKey)
    ).rejects.toThrow();
  });
}); 