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
<<<<<<< HEAD
} 
>>>>>>> 37e209b0 (Add photo upload functionality with S3 integration)
=======
}
>>>>>>> c1801e78 (added photo.ts shared types from s2 branch (not merged yet))
