"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/trpc-client";
import { ExperimentResults } from "@/components/experiment-results";

export default function ExperimentDetailPage() {
  const params = useParams();
  const experimentId = params.id as string;
  const [orgId, setOrgId] = useState<string | null>(null);
  
  useEffect(() => {
    const cookie = document.cookie.split('; ').find(row => row.startsWith('currentOrgId='));
    if (cookie) {
      setOrgId(cookie.split('=')[1]);
    }
  }, []);

  const queryEnabled = !!experimentId && !!orgId;
  
  const queryResult = api.experiments.get.useQuery(
    { orgId: orgId!, experimentId },
    { enabled: queryEnabled }
  );
  
  const experiment = queryResult.data;
  const isLoading = queryResult.isLoading;
  
  useEffect(() => {
    if (experiment?.status === "running") {
      const interval = setInterval(() => queryResult.refetch(), 2000);
      return () => clearInterval(interval);
    }
  }, [experiment?.status]);

  const isOwner = true;
  const isRunning = experiment?.status === "running";

  if (!orgId) return <div className="p-6">Loading...</div>;
  if (isLoading) return <div className="p-6">Loading...</div>;
  if (!experiment) return <div className="p-6">Experiment not found</div>;

  const progress = experiment.totalRuns > 0 
    ? Math.round((experiment.completedRuns / experiment.totalRuns) * 100)
    : 0;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{experiment.name}</h1>
        <div className="flex items-center gap-4 mt-2">
          <span className={`px-2 py-1 rounded text-sm ${
            experiment.status === "running" ? "bg-blue-100 text-blue-800" :
            experiment.status === "done" ? "bg-green-100 text-green-800" :
            "bg-gray-100 text-gray-800"
          }`}>
            {experiment.status}
          </span>
          {experiment.winnerVersion && (
            <span className="text-sm text-green-600">Winner declared</span>
          )}
        </div>
      </div>

      {isRunning && (
        <div className="mb-6 p-4 border rounded">
          <div className="flex justify-between mb-2">
            <span>Progress</span>
            <span>{experiment.completedRuns} / {experiment.totalRuns} runs</span>
          </div>
          <div className="h-2 bg-gray-200 rounded overflow-hidden">
            <div 
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {experiment.status === "done" && experiment.totalRuns > 0 ? (
        <ExperimentResults 
          experimentId={experimentId} 
          orgId={orgId}
          canDeclare={isOwner && !experiment.winnerVersion}
        />
      ) : isRunning ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Experiment in progress...</p>
          <p className="text-sm text-muted-foreground mt-2">
            Results will appear when all runs complete
          </p>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Experiment not started</p>
        </div>
      )}
    </div>
  );
}