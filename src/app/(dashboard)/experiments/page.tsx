"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useState as useEffectState } from "react";
import { api } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";

export default function ExperimentsListPage() {
  const router = useRouter();
  const [orgId, setOrgId] = useEffectState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  useEffect(() => {
    const cookie = document.cookie.split('; ').find(row => row.startsWith('currentOrgId='));
    if (cookie) {
      setOrgId(cookie.split('=')[1]);
    }
  }, []);

  const queryEnabled = !!orgId;
  
  const { data: experiments, isLoading, refetch } = api.experiments.list.useQuery(
    { orgId: orgId! },
    { enabled: queryEnabled }
  );

  const deleteMutation = api.experiments.delete.useMutation({
    onSuccess: () => {
      setDeleteId(null);
      refetch();
    },
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync({ orgId: orgId!, experimentId: deleteId });
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  if (!orgId) return <div className="p-6">Loading...</div>;
  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Experiments</h1>
      </div>

      {!experiments || experiments.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <div className="text-4xl mb-4">🧪</div>
          <p className="text-lg font-medium">No experiments yet</p>
          <p className="text-sm text-muted-foreground mt-2 mb-4">
            Run your first A/B test to compare prompt versions
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {experiments.map((experiment) => (
            <Link
              key={experiment.id}
              href={`/experiments/${experiment.id}`}
              className="block p-4 border rounded hover:bg-gray-50 group relative"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{experiment.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Status: {experiment.status}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    experiment.status === "running" ? "bg-blue-100 text-blue-800" :
                    experiment.status === "done" ? "bg-green-100 text-green-800" :
                    "bg-gray-100 text-gray-800"
                  }`}>
                    {experiment.status}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteId(experiment.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Dialog.Root open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background rounded-lg border shadow-2xl z-50 p-6">
            <Dialog.Title className="text-lg font-semibold mb-2">
              Delete Experiment
            </Dialog.Title>
            <Dialog.Description className="text-muted-foreground mb-6">
              Are you sure you want to delete this experiment? This action cannot be undone and all results will be lost.
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