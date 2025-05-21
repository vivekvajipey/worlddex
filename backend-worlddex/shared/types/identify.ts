export interface IdentifyRequest {
  base64Data: string;
  contentType: string;
  gps?: { lat: number; lng: number } | null;
}

export interface Tier1Result { 
  label: string | null;
  category?: string | null;
  subcategory?: string | null;
  rarityScore?: number;
  rarityTier?: "common" | "uncommon" | "rare" | "epic" | "mythic" | "legendary";
}

export interface Tier2Result {
  label: string | null;
  provider: string;
  confidence: number;
}

export interface IdentifyResponse {
  status: "done" | "pending";
  tier1: Tier1Result;
  jobId?: string;           // present when status==="pending"
  tier2?: Tier2Result;      // present when status==="done" and Tier‑2 ran
}