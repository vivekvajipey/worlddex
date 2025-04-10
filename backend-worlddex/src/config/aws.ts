import { S3Client } from '@aws-sdk/client-s3';

if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_S3_BUCKET) {
  throw new Error('Missing required AWS environment variables');
}

export const AWS_CONFIG = {
  region: process.env.AWS_REGION,
  bucket: process.env.AWS_S3_BUCKET,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
} as const;

export const s3Client = new S3Client({
  region: AWS_CONFIG.region,
  credentials: AWS_CONFIG.credentials,
}); 