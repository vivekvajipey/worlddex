import { Capture } from '../../database/types';
import { PendingCapture } from '../services/offlineCaptureService';

// Combined type for displaying both server and pending captures
export interface CombinedCapture extends Partial<Capture> {
  id: string;
  image_key: string; // For server captures
  imageUri?: string; // For pending captures (local file URI)
  captured_at?: string;
  capturedAt?: string; // Pending captures use this field
  isPending?: boolean;
  pendingStatus?: PendingCapture['status'];
  pendingError?: string;
  // Make other fields optional since pending captures won't have them
  item_name?: string;
  capture_number?: number;
  segmented_image_key?: string;
  location?: any;
  like_count?: number;
  daily_upvotes?: number;
  is_public?: boolean;
  comment_count?: number;
  thumb_key?: string;
  rarity_tier?: string;
  rarity_score?: number;
  _pendingData?: PendingCapture; // Store original pending capture data
}