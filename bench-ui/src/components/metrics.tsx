"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BenchmarkMetrics } from "@/lib/types";
import { AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown, HelpCircle } from "lucide-react";

interface MetricsProps {
  metrics: BenchmarkMetrics | null;
}

const MetricItem: React.FC<{
  title: string;
  value: string | number;
  unit?: string;
  icon?: React.ElementType;
  progressValue?: number; // 0-100 for progress bar
  description?: string;
}> = ({ title, value, unit, icon: Icon, progressValue, description }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">
        {value}
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
      {typeof progressValue === "number" && (
        <Progress value={progressValue} className="mt-2 h-2" />
      )}
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </CardContent>
  </Card>
);

export function Metrics({ metrics }: MetricsProps) {
  if (!metrics) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
            <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Loading...</CardTitle>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-muted-foreground">-</div>
                    <Progress value={0} className="mt-2 h-2" />
                </CardContent>
            </Card>
        ))}
      </div>
    );
  }

  const formatPercent = (value: number) => (value * 100).toFixed(1);
  const formatLatency = (value: number) => value.toFixed(0);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
      <MetricItem
        title="Overall Accuracy"
        value={formatPercent(metrics.overallAccuracy)}
        unit="%"
        icon={CheckCircle}
        progressValue={metrics.overallAccuracy * 100}
        description={groundTruthAvailable(metrics) ? "Based on ground truth" : "Ground truth N/A"}
      />
      <MetricItem
        title="Tier-1 Accuracy"
        value={formatPercent(metrics.tier1Accuracy)}
        unit="%"
        icon={TrendingUp}
        progressValue={metrics.tier1Accuracy * 100}
        description={groundTruthAvailable(metrics) ? "T1 vs Ground Truth" : "Ground truth N/A"}
      />
      <MetricItem
        title="Avg. Latency"
        value={formatLatency(metrics.avgLatency)}
        unit=" ms"
        icon={Clock}
        description={`P90: ${formatLatency(metrics.p90Latency)} ms`}
      />
      <MetricItem
        title="Successful Requests"
        value={metrics.successfulRequests}
        icon={TrendingUp}
        description={`${((metrics.successfulRequests / metrics.totalImages) * 100 || 0).toFixed(0)}% of ${metrics.totalImages} total`}
      />
      {/* Optional: Add more cards for Tier2 Acc or Failed Requests if needed */}
      {/* <MetricItem
        title="Tier-2 Accuracy"
        value={formatPercent(metrics.tier2Accuracy)}
        unit="%"
        icon={TrendingUp}
        progressValue={metrics.tier2Accuracy * 100}
        description={metrics.tier2Accuracy > 0 ? "T2 vs Ground Truth (where T2 exists)" : "No T2 data for GT comparison"}
      />
      <MetricItem
        title="Failed Requests"
        value={metrics.failedRequests}
        icon={AlertTriangle}
        description={`${((metrics.failedRequests / metrics.totalImages) * 100 || 0).toFixed(0)}% of ${metrics.totalImages} total`}
      /> */}
    </div>
  );
}

// Helper to check if ground truth was available for accuracy calculation
function groundTruthAvailable(metrics: BenchmarkMetrics): boolean {
    // A simple proxy: if overall accuracy is calculated based on some entries, GT was used.
    // This assumes overallAccuracy would be 0 if no GT entries were processed.
    // A more robust check might involve looking at how many GT entries were actually compared.
    return metrics.overallAccuracy > 0 || metrics.tier1Accuracy > 0 || metrics.tier2Accuracy > 0 || (metrics.successfulRequests === 0 && metrics.totalImages > 0);
}
