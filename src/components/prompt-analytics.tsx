"use client";

import { api } from "@/lib/trpc-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PromptAnalyticsProps {
  promptId: string;
  orgId: string;
}

export function PromptAnalytics({ promptId, orgId }: PromptAnalyticsProps) {
  const { data, isLoading } = api.analytics.promptSummary.useQuery(
    { orgId, promptId },
    { staleTime: 30000 }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        Loading analytics...
      </div>
    );
  }

  if (!data || data.totalRuns === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p className="text-lg mb-2">No analytics data yet</p>
        <p className="text-sm">Run some experiments or API calls to see metrics here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalRuns}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.avgLatency}ms</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(data.totalTokensIn + data.totalTokensOut).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Experiment Wins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.experimentWins} <span className="text-sm font-normal text-muted-foreground">({data.winRate}%)</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}