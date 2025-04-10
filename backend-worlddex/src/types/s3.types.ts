import type { _Object as S3Object } from '@aws-sdk/client-s3';

// Internal service options
export interface S3UploadOptions {
  key: string;
  body: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
  acl?: 'private' | 'public-read';
}

// Internal service response
export interface S3UploadResponse {
  key: string;
  url: string;
  contentType: string;
  metadata?: Record<string, string>;
}

// Internal service error
export class S3Error extends Error {
  constructor(
    message: string, 
    public readonly code?: string,
    public readonly key?: string
  ) {
    super(message);
    this.name = 'S3Error';
  }
}

// Internal helper types
export interface S3ListOptions {
  prefix?: string;
  maxKeys?: number;
  continuationToken?: string;
}

export interface UploadResponse {
  key: string;
  url: string;
  contentType: string;
}

export interface GetFileResponse {
  content: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
} 