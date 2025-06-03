export type RarityTier = "common" | "uncommon" | "rare" | "epic" | "mythic" | "legendary";

export interface Tier1ResultJson {
  label: string;
  category?: string;
  subcategory?: string;
  rarityScore?: number;
  // rarityTier is NOT present in the raw JSON, it's added by assignRarityTierToResults
}

export interface Tier1Result extends Tier1ResultJson {
  rarityTier?: RarityTier; // Using the RarityTier type, now explicitly added after parsing
}

export interface Tier2Result {
  label: string;
  provider: string;
  confidence: number;
}

// Represents the raw structure from JSONL before post-processing
export interface BenchmarkResultJson {
  file: string;
  latency: number;
  tier1: Tier1ResultJson; // Uses Tier1ResultJson without rarityTier
  tier2: Tier2Result | null;
  cost?: number; // Added cost
  error?: string;
}

// Represents the processed structure used by the UI components
export interface BenchmarkResult {
  file: string;
  latency: number;
  tier1: Tier1Result; // Uses Tier1Result with rarityTier
  tier2: Tier2Result | null;
  cost?: number; // Added cost
  error?: string; // To capture any processing errors from run-eval.ts
}

export interface GroundTruthData {
  label: string;
  category?: string;
  subcategory?: string;
}

export interface GroundTruth {
  [filename: string]: GroundTruthData;
}

export interface BenchmarkMetrics {
  totalImages: number;
  successfulRequests: number;
  failedRequests: number;
  errorRate: number; // Added
  overallAccuracy: number;
  tier1Accuracy: number;
  tier2Accuracy: number; // Accuracy if Tier 2 label is present
  avgLatency: number;
  p50Latency: number; // Added (median)
  p90Latency: number;
  p95Latency: number; // Added
  p99Latency: number; // Added
  resultsWithGroundTruth: number; // Added - count of results that had a GT entry
  tier2ResultsCount: number; // Added - count of results that had a Tier2 identification
  totalCost: number; // Added
  avgCostPerImage: number; // Added
  // costEstimate: number; // Placeholder for future cost tracking
}
