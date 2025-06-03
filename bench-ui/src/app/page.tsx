import { promises as fs } from "fs";
import path from "path";
// PapaParse is a default export, so we import it this way:
import Papa from "papaparse"; 
import { BenchmarkResult, BenchmarkResultJson, GroundTruth, BenchmarkMetrics } from "@/lib/types";
import { calculateBenchmarkMetrics, assignRarityTierToResults } from "@/lib/utils";
import { ResultsTable } from "@/components/results-table";
import { Metrics } from "@/components/metrics";

async function getBenchmarkData(): Promise<{
  results: BenchmarkResult[];
  groundTruth?: GroundTruth;
  metrics: BenchmarkMetrics | null;
}> {
  try {
    const resultsPath = path.join(process.cwd(), "public", "sample-results.jsonl");
    const groundTruthPath = path.join(process.cwd(), "public", "sample-ground-truth.json");

    const resultsFile = await fs.readFile(resultsPath, "utf-8");
    
    // Parse JSONL: split by lines and parse each line as JSON
    // Ensure each line is valid JSON before parsing
    const parsedResults: BenchmarkResultJson[] = resultsFile
      .trim()
      .split("\n")
      .filter(line => line.trim() !== "") // Remove empty lines
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          console.error("Failed to parse line: ", line, e);
          return null; // Or handle error appropriately
        }
      })
      .filter(Boolean) as BenchmarkResultJson[]; // Filter out nulls from parse errors

    // Assign rarity tier based on score, as this might not be in raw results
    const resultsWithRarity = assignRarityTierToResults(parsedResults);

    let groundTruth: GroundTruth | undefined = undefined;
    try {
      const groundTruthFile = await fs.readFile(groundTruthPath, "utf-8");
      groundTruth = JSON.parse(groundTruthFile);
    } catch (error) {
      console.warn("Ground truth file not found or could not be parsed. Proceeding without it.");
      // It's okay if ground truth is not present, metrics will reflect that.
    }

    const metrics = calculateBenchmarkMetrics(resultsWithRarity, groundTruth);

    return { results: resultsWithRarity, groundTruth, metrics };
  } catch (error) {
    console.error("Error loading benchmark data:", error);
    // Return empty/null state so the page can still render with an error message or empty state
    return { 
      results: [], 
      groundTruth: undefined, 
      metrics: {
        totalImages: 0,
        successfulRequests: 0,
        failedRequests: 0,
        avgLatency: 0,
        p50Latency: 0,
        p90Latency: 0,
        p95Latency: 0,
        p99Latency: 0,
        overallAccuracy: 0,
        tier1Accuracy: 0,
        tier2Accuracy: 0,
        errorRate: 0,
        resultsWithGroundTruth: 0,
        tier2ResultsCount: 0,
      } 
    };
  }
}

export default async function BenchPage() {
  const { results, groundTruth, metrics } = await getBenchmarkData();

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Val-Set Bench UI
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Benchmark results for image identification models.
        </p>
      </header>

      <section className="mb-6">
        <Metrics metrics={metrics} />
      </section>

      <section>
        <ResultsTable data={results} groundTruth={groundTruth} />
      </section>
    </div>
  );
}
