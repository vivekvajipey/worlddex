export interface VlmIdentificationRequest {
    base64Data: string;
    contentType: string; // e.g., "image/jpeg", "image/png"
}

export type RarityTier =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "mythic"
  | "legendary";

export interface VlmIdentificationResponse {
  label: string | null;
  category?: string | null;
  subcategory?: string | null;

  /** 1 – 100, higher = more interesting / aesthetic */
  rarityScore?: number;

  /** bucketed category sampled from rarityScore */
  rarityTier?: RarityTier;

  /** XP value calculated from rarity tier */
  xpValue?: number;
}