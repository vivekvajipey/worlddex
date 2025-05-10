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
  is_onboarded?: boolean;
  default_public_captures?: boolean;
  balance: number;
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
  thumb_key?: string;
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
  like_count?: number;
  daily_upvotes?: number;
  is_public?: boolean;
  comment_count?: number;
  thumb_key?: string;
  last_owner_id?: string;
  transaction_type?: "buy-now" | "auction" | "trade";
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
  is_active: boolean;
  collected_reward: boolean;
};

export type CaptureLike = {
  user_id: string;
  capture_id: string;
  created_at?: string;
};

export type CaptureComment = {
  id: string;
  user_id: string;
  capture_id?: string;
  listing_id?: string;
  comment_text: string;
  created_at?: string;
};

export type Listing = {
  id: string;
  seller_id: string;
  title: string;
  description?: string;
  listing_type: "auction" | "buy-now" | "trade";
  auction_type?: "first-price" | "second-price";
  price?: number;
  reserve_price?: number;
  status: "active" | "completed" | "canceled" | "expired";
  created_at?: string;
  expires_at: string;
  completed_at?: string;
  listing_items?: { captures: Capture }[];
};

export type ListingItem = {
  id: string;
  listing_id: string;
  capture_id: string;
};

export type Bid = {
  id: string;
  listing_id: string;
  bidder_id: string;
  amount: number;
  status: "active" | "winning" | "outbid" | "rejected" | "canceled";
  created_at?: string;
};

export type TradeOffer = {
  id: string;
  listing_id: string;
  offerer_id: string;
  status: "pending" | "accepted" | "rejected" | "canceled";
  message?: string;
  created_at?: string;
  updated_at?: string;
};

export type TradeOfferItem = {
  id: string;
  trade_offer_id: string;
  capture_id: string;
};

export type Transaction = {
  id: string;
  listing_id?: string;
  buyer_id: string;
  seller_id: string;
  transaction_type: "buy-now" | "auction" | "trade";
  coins_amount: number;
  trade_offer_id?: string;
  created_at?: string;
};
