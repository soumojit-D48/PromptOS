"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/trpc-client";
import { ExperimentResults } from "@/components/experiment-results";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

export default function ExperimentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const experimentId = params.id as string;
  const [orgId, setOrgId] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  
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
  
  const deleteMutation = api.experiments.delete.useMutation({
    onSuccess: () => {
      setShowDelete(false);
      router.push("/experiments");
    },
  });

  const experiment = queryResult.data;
  const isLoading = queryResult.isLoading;
  
  useEffect(() => {
    if (experiment?.status === "running") {
      const interval = setInterval(() => queryResult.refetch(), 2000);
      return () => clearInterval(interval);
    }
  }, [experiment?.status]);

  const isRunning = experiment?.status === "running";

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({ orgId: orgId!, experimentId });
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  if (!orgId) return <div className="p-6">Loading...</div>;
  if (isLoading) return <div className="p-6">Loading...</div>;
  if (!experiment) return <div className="p-6">Experiment not found</div>;

  const progress = experiment.totalRuns > 0 
    ? Math.round((experiment.completedRuns / experiment.totalRuns) * 100)
    : 0;

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDelete(true)}
          className="text-muted-foreground hover:text-red-600 hover:bg-red-50"
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Delete
        </Button>
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
          canDeclare={true}
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

      <Dialog.Root open={showDelete} onOpenChange={setShowDelete}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background rounded-lg border shadow-2xl z-50 p-6">
            <Dialog.Title className="text-lg font-semibold mb-2">
              Delete Experiment
            </Dialog.Title>
            <Dialog.Description className="text-muted-foreground mb-6">
              Are you sure you want to delete "{experiment.name}"? This action cannot be undone and all results will be lost.
            </Dialog.Description>
            
            <div className="flex justify-end gap-3">
              <Dialog.Close asChild>
                <Button variant="outline">Cancel</Button>
              </Dialog.Close>
              <Button 
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}