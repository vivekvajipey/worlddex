import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { RarityTier, BenchmarkResult, BenchmarkResultJson, GroundTruth, BenchmarkMetrics } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Rarity Tier Logic (mirrors backend)
export function assignRarityTier(score: number | undefined): RarityTier {
  if (score === undefined || score < 1 || score > 100 || Number.isNaN(score)) return "common";
  if (score >= 96) return "legendary";
  if (score >= 90) return "mythic";
  if (score >= 80) return "epic";
  if (score >= 60) return "rare";
  if (score >= 45) return "uncommon";
  return "common";
}

// Function to add rarityTier to results (used in page.tsx before calculating metrics)
export function assignRarityTierToResults(resultsJson: BenchmarkResultJson[]): BenchmarkResult[] {
  return resultsJson.map(resultJson => {
    const tier1WithRarity = {
      ...resultJson.tier1,
      rarityTier: assignRarityTier(resultJson.tier1.rarityScore),
    };
    return {
      ...resultJson,
      tier1: tier1WithRarity,
    };
  });
}

// Tailwind classes for Rarity (mirrors frontend)
export const rarityColorBg: Record<RarityTier, string> = {
  common: "bg-[#F3E8E2]",
  uncommon: "bg-[#A7F3D0]",
  rare: "bg-[#BFDBFE]",
  epic: "bg-[#FECACA]",
  mythic: "bg-[#DDD6FE]",
  legendary: "bg-[#FDE68A]",
};

export const rarityColorText: Record<RarityTier, string> = {
  common: "text-[#6B7280]",
  uncommon: "text-[#047857]",
  rare: "text-[#1D4ED8]",
  epic: "text-[#B91C1C]",
  mythic: "text-[#5B21B6]",
  legendary: "text-[#92400E]",
};

export function getRarityClasses(score: number | undefined): string {
  const tier = assignRarityTier(score);
  return `${rarityColorBg[tier]} ${rarityColorText[tier]}`;
}

// Metric Calculation Helpers
function calculatePercentile(arr: number[], percentile: number): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  if (Number.isInteger(index)) {
    return sorted[index];
  }
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export function calculateBenchmarkMetrics(results: BenchmarkResult[], groundTruth?: GroundTruth): BenchmarkMetrics {
  const totalImages = results.length;
  const defaultMetrics: BenchmarkMetrics = {
    totalImages: 0,
    successfulRequests: 0,
    failedRequests: 0,
    errorRate: 0,
    overallAccuracy: 0,
    tier1Accuracy: 0,
    tier2Accuracy: 0,
    avgLatency: 0,
    p50Latency: 0,
    p90Latency: 0,
    p95Latency: 0,
    p99Latency: 0,
    resultsWithGroundTruth: 0,
    tier2ResultsCount: 0,
    totalCost: 0,
    avgCostPerImage: 0,
  };

  if (totalImages === 0) {
    return defaultMetrics;
  }

  let successfulRequests = 0;
  let failedRequests = 0;
  let overallCorrect = 0;
  let tier1Correct = 0;
  let tier2Correct = 0;
  let tier2Comparisons = 0;
  let resultsWithGroundTruth = 0;
  let tier2ResultsCount = 0;
  const latencies: number[] = [];
  let currentTotalCost = 0;

  results.forEach(result => {
    if (result.error || !result.tier1?.label) {
      failedRequests++;
      return;
    }
    successfulRequests++;
    latencies.push(result.latency);
    currentTotalCost += result.cost || 0;

    if (result.tier2?.label) {
      tier2ResultsCount++;
    }

    const truth = groundTruth?.[result.file];
    if (truth) {
      resultsWithGroundTruth++;
      const tier1Label = result.tier1.label?.toLowerCase();
      const tier2Label = result.tier2?.label?.toLowerCase();
      const truthLabel = truth.label.toLowerCase();

      if (tier1Label === truthLabel) {
        tier1Correct++;
      }

      if (tier2Label) {
        tier2Comparisons++; // Count T2 comparisons only if T2 label exists
        if (tier2Label === truthLabel) {
          tier2Correct++;
        }
      }
      
      // Overall: prefer Tier 2 if available, else Tier 1
      if ((tier2Label && tier2Label === truthLabel) || (!tier2Label && tier1Label === truthLabel)) {
        overallCorrect++;
      }
    }
  });

  return {
    totalImages,
    successfulRequests,
    failedRequests,
    errorRate: totalImages > 0 ? failedRequests / totalImages : 0,
    overallAccuracy: resultsWithGroundTruth > 0 ? overallCorrect / resultsWithGroundTruth : 0,
    tier1Accuracy: resultsWithGroundTruth > 0 ? tier1Correct / resultsWithGroundTruth : 0,
    tier2Accuracy: tier2Comparisons > 0 ? tier2Correct / tier2Comparisons : 0,
    avgLatency: latencies.length > 0 ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length : 0,
    p50Latency: calculatePercentile(latencies, 50),
    p90Latency: calculatePercentile(latencies, 90),
    p95Latency: calculatePercentile(latencies, 95),
    p99Latency: calculatePercentile(latencies, 99),
    resultsWithGroundTruth,
    tier2ResultsCount,
    totalCost: currentTotalCost,
    avgCostPerImage: successfulRequests > 0 ? currentTotalCost / successfulRequests : 0,
  };
}
