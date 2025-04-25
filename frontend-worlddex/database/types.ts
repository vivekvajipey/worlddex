export type User = {
  id: string;
  email: string;
  username: string;
  profile_picture_key?: string;
  created_at?: string;
  reputation_points: number;
  capture_tier: number;
  daily_captures_used: number;
  capture_streak: number;
  isOnboarded?: boolean;
};

export type Collection = {
  id: string;
  name: string;
  description?: string;
  cover_photo_key?: string;
  created_at?: string;
  created_by: string;
  is_featured: boolean;
};

export type AllItem = {
  id: string;
  name: string;
  description?: string;
  global_rarity?: string;
  total_captures: number;
  created_at?: string;
};

export type CollectionItem = {
  id: string;
  collection_id: string;
  item_id: string;
  silhouette_key: string;
  is_secret_rare: boolean;
  collection_rarity?: string;
  created_at?: string;
  location?: any; // Geography point type
  display_name: string;
  name: string;
};

export type Capture = {
  id: string;
  user_id: string;
  item_id: string;
  item_name: string;
  capture_number: number;
  image_key: string;
  segmented_image_key: string;
  captured_at?: string;
  location?: any; // Geography point type
};

export type UserCollectionItem = {
  id: string;
  user_id: string;
  collection_item_id: string;
  capture_id: string;
  collection_id: string;
  collected_at?: string;
};

export type UserCollection = {
  id: string;
  user_id: string;
  collection_id: string;
  added_at?: string;
};
