"use client";

import { api } from "@/lib/trpc-client";
import { Button } from "./ui/button";

interface ExperimentResultsProps {
  experimentId: string;
  orgId: string;
  canDeclare: boolean;
}

interface VariantResult {
  versionId: string;
  versionNum?: number;
  runCount: number;
  avgLatency: number;
  p50Latency: number;
  p95Latency: number;
  avgTokensIn: number;
  avgTokensOut: number;
  avgScore: number | null;
}

export function ExperimentResults({ experimentId, orgId, canDeclare }: ExperimentResultsProps) {
  const { data: results, isLoading } = api.experiments.results.useQuery({ orgId, experimentId });
  const declareMutation = api.experiments.declare.useMutation();

  const handleDeclare = async (versionId: string) => {
    if (!confirm("Publishing this version will make it live for all API callers. Continue?")) return;
    try {
      await declareMutation.mutateAsync({ orgId, experimentId, versionId });
    } catch (error) {
      console.error("Failed to declare winner:", error);
    }
  };

  if (isLoading) {
    return <div>Loading results...</div>;
  }

  if (!results || results.length === 0) {
    return <div>No results yet</div>;
  }

  const bestLatency = Math.min(...results.filter(r => r.runCount > 0).map(r => r.avgLatency));
  const bestScore = results.find(r => r.avgScore !== null && r.runCount > 0);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Results</h2>
      
      <div className="grid gap-4">
        {results.map((result, idx) => {
          const isBetterLatency = result.avgLatency > 0 && result.avgLatency === bestLatency && bestLatency > 0;
          const isBetterScore = bestScore && result.versionId === bestScore.versionId;
          
          return (
            <div
              key={result.versionId}
              className={`p-4 border rounded-lg ${
                isBetterLatency || isBetterScore ? "border-green-500 bg-green-50" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Version {idx + 1}</h3>
                {(isBetterLatency || isBetterScore) && (
                  <span className="text-sm text-green-600 font-medium">Best</span>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Runs:</span> {result.runCount}
                </div>
                <div>
                  <span className="text-muted-foreground">Avg Latency:</span> {result.avgLatency}ms
                </div>
                <div>
                  <span className="text-muted-foreground">p50:</span> {result.p50Latency}ms
                </div>
                <div>
                  <span className="text-muted-foreground">p95:</span> {result.p95Latency}ms
                </div>
                <div>
                  <span className="text-muted-frontend">Avg Tokens In:</span> {result.avgTokensIn}
                </div>
                <div>
                  <span className="text-muted-foreground">Avg Tokens Out:</span> {result.avgTokensOut}
                </div>
                {result.avgScore !== null && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Avg Score:</span> {result.avgScore}/5
                  </div>
                )}
              </div>

              {canDeclare && result.runCount > 0 && (
                <Button
                  className="mt-4"
                  onClick={() => handleDeclare(result.versionId)}
                >
                  Declare Winner
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}