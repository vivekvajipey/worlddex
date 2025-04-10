export interface PhotoUpload {
<<<<<<< HEAD
    base64Data: string;
    fileName: string;
    contentType: string; // e.g. "image/jpeg"
  }
  
  export interface PhotoUploadResponse {
    url: string;  // The S3 signed URL
    key: string;  // The S3 key/path where the photo is stored
  } 
=======
  base64Data: string;
  fileName: string;
  contentType: string; // e.g. "image/jpeg"
}

export interface PhotoUploadResponse {
  url: string;  // The S3 signed URL
  key: string;  // The S3 key/path where the photo is stored
} 
>>>>>>> 37e209b0 (Add photo upload functionality with S3 integration)
