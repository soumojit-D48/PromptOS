"use client";

import { api } from "@/lib/trpc-client";
import { Button } from "./ui/button";
import { HelpCircle } from "lucide-react";

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

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="group relative inline-flex items-center">
      {children}
      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 ml-1 cursor-help" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );
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

  const getBadge = (value: number, bestValue: number) => {
    if (value === 0) return null;
    const isBest = value === bestValue;
    return (
      <span className={`text-xs px-1.5 py-0.5 rounded ${isBest ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
        {isBest ? "Best" : ""}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold">Results</h2>
        <span className="text-sm text-muted-foreground">
          (Lower latency = faster, highlighted in green)
        </span>
      </div>
      
      <div className="grid gap-4">
        {results.map((result, idx) => {
          const isBest = result.avgLatency > 0 && result.avgLatency === bestLatency && bestLatency > 0;
          const isBestScore = bestScore && result.versionId === bestScore.versionId;
          const isWinner = isBest || isBestScore;
          
          return (
            <div
              key={result.versionId}
              className={`p-5 border-2 rounded-xl ${
                isWinner 
                  ? "border-green-500 bg-green-50/50 shadow-md" 
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${isWinner ? "text-green-700" : ""}`}>
                    Version {idx + 1}
                  </span>
                  {isWinner && (
                    <span className="text-sm px-2 py-0.5 bg-green-500 text-white rounded-full font-medium">
                      Winner
                    </span>
                  )}
                </div>
                {result.runCount > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {result.runCount} run{result.runCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-background/50 rounded-lg p-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    Avg Latency
                    <Tooltip text="Average response time across all runs">
                      <HelpCircle className="w-3 h-3" />
                    </Tooltip>
                  </div>
                  <div className={`text-xl font-bold ${isBest ? "text-green-600" : ""}`}>
                    {result.avgLatency > 0 ? `${result.avgLatency.toLocaleString()}ms` : "—"}
                    {getBadge(result.avgLatency, bestLatency)}
                  </div>
                </div>
                
                <div className="bg-background/50 rounded-lg p-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    p50
                    <Tooltip text="50% of runs complete faster than this (median)">
                      <HelpCircle className="w-3 h-3" />
                    </Tooltip>
                  </div>
                  <div className="text-lg font-semibold">
                    {result.p50Latency > 0 ? `${result.p50Latency.toLocaleString()}ms` : "—"}
                  </div>
                </div>
                
                <div className="bg-background/50 rounded-lg p-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    p95
                    <Tooltip text="95% of runs complete faster than this (near-worst case)">
                      <HelpCircle className="w-3 h-3" />
                    </Tooltip>
                  </div>
                  <div className="text-lg font-semibold">
                    {result.p95Latency > 0 ? `${result.p95Latency.toLocaleString()}ms` : "—"}
                  </div>
                </div>
                
                <div className="bg-background/50 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1">Tokens In</div>
                  <div className="text-lg font-semibold">
                    {result.avgTokensIn > 0 ? result.avgTokensIn.toLocaleString() : "—"}
                  </div>
                </div>
                
                <div className="bg-background/50 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1">Tokens Out</div>
                  <div className="text-lg font-semibold">
                    {result.avgTokensOut > 0 ? result.avgTokensOut.toLocaleString() : "—"}
                  </div>
                </div>
                
                {result.avgScore !== null && (
                  <div className="bg-background/50 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">Avg Score</div>
                    <div className="text-lg font-semibold">
                      {result.avgScore}/5
                    </div>
                  </div>
                )}
              </div>

              {canDeclare && result.runCount > 0 && !isWinner && (
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => handleDeclare(result.versionId)}
                >
                  Make This Version Live
                </Button>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
        <div className="font-medium mb-1">How to read these results:</div>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li><strong>Latency</strong> — How fast the AI responds. Lower is better.</li>
          <li><strong>p50</strong> — Median time; half of requests are faster.</li>
          <li><strong>p95</strong> — 95% of requests are faster (worst-case benchmark).</li>
          <li>Green highlight = fastest version (winner).</li>
        </ul>
      </div>
    </div>
  );
}