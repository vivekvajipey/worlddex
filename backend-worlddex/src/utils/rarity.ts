import { RarityTier } from "../../shared/types/vlm";

/**
 * Turn a 1-100 score into a tier using deterministic thresholds.
 * Higher scores get better tiers with no randomness.
 */
export function assignRarityTier(score: number): RarityTier {
  if (score < 1 || score > 100 || Number.isNaN(score))
    return "common"; // fallback

  // Fixed thresholds - no randomness
  if (score >= 96) return "legendary";   // Top 4%
  if (score >= 90) return "mythic";      // Next 6%
  if (score >= 80) return "epic";        // Next 10%
  if (score >= 60) return "rare";        // Next 20%
  if (score >= 45) return "uncommon";    // Next 15%
  return "common";                       // Bottom 10%
}