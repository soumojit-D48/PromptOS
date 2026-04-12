"use client";

import { useState } from "react";
import { api } from "@/lib/trpc-client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AnalyticsChartProps {
  orgId: string;
}

const timeWindows = [
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
  { label: "90 Days", value: "90d" },
] as const;

export function AnalyticsChart({ orgId }: AnalyticsChartProps) {
  const [window, setWindow] = useState<"7d" | "30d" | "90d">("7d");

  const { data: summary, isLoading: summaryLoading } = api.analytics.orgSummary.useQuery(
    { orgId },
    { staleTime: 30000 }
  );

  const { data: timeline, isLoading: timelineLoading } = api.analytics.timeline.useQuery(
    { orgId, window },
    { staleTime: 30000 }
  );

  const isLoading = summaryLoading || timelineLoading;

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {timeWindows.map((w) => (
          <Button
            key={w.value}
            variant={window === w.value ? "default" : "outline"}
            size="sm"
            onClick={() => setWindow(w.value)}
          >
            {w.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : formatNumber(summary?.totalRuns || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading
                ? "..."
                : formatNumber(
                    (summary?.totalTokensIn || 0) + (summary?.totalTokensOut || 0)
                  )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading
                ? "..."
                : `${Math.round(summary?.avgLatency || 0)}ms`}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Est. Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading
                ? "..."
                : `$${(summary?.estimatedCost || 0).toFixed(4)}`}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Runs Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              Loading...
            </div>
          ) : timeline && timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => {
                    const d = new Date(value);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => {
                    const d = new Date(value);
                    return d.toLocaleDateString();
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="runs"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No data available. Run some experiments to see analytics.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Prompts by Usage</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : summary?.topPrompts && summary.topPrompts.length > 0 ? (
            <div className="space-y-4">
              {summary.topPrompts.map((prompt: { id: string; name: string; runCount: number }, index: number) => (
                <div
                  key={prompt.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{prompt.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {prompt.runCount} runs
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No prompts have been run yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}