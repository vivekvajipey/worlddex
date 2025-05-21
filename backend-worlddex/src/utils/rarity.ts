import { RarityTier } from "../../shared/types/vlm";

/**
 * Turn a 1-100 score into a tier by *sampling* from a skewed distribution.
 * Higher scores get dramatically better odds, but nothing is guaranteed.
 */
export function sampleRarityTier(score: number): RarityTier {
  if (score < 1 || score > 100 || Number.isNaN(score))
    throw new Error("score must be 1-100");

  // Convert to 0-1
  const x = score / 100;

  /* Probability mass for each tier as a function of x
     (piece-wise linear is simple & easy to tune later)      */
  const weights = {
    common:      Math.max(0, 0.75 - 0.70 * x),    // 75 % ⇒  5 %
    uncommon:    Math.max(0, 0.20 - 0.15 * x),
    rare:        Math.max(0, 0.04 + 0.10 * x),
    epic:        Math.max(0, 0.009 + 0.08 * x),
    mythic:      Math.max(0, 0.001 + 0.05 * x),
    legendary:   0.0005 + 0.02 * x                // goes to 2.05 % at x=1
  } as const;

  // Roulette-wheel sampling
  const r = Math.random();
  let acc = 0;
  for (const [tier, w] of Object.entries(weights) as [RarityTier, number][]) {
    acc += w;
    if (r < acc) return tier;
  }
  return "common"; // fallback
}