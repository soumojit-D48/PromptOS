"use client";

import { useState } from "react";
import { api } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";

interface Version {
  id: string;
  versionNum: number;
  content: string;
  model: string;
  params: { temperature: number; maxTokens: number; systemPrompt?: string };
  isPublished: boolean;
  commitMsg: string | null;
  createdAt: Date;
}

interface VersionListProps {
  promptId: string;
  orgId: string;
  versions: Version[];
  currentVersionId?: string;
  publishedVersionId?: string;
}

export function VersionList({ promptId, orgId, versions, currentVersionId, publishedVersionId }: VersionListProps) {
  const router = useRouter();
  const [rollbackOpen, setRollbackOpen] = useState(false);
  const [rollbackVersionId, setRollbackVersionId] = useState<string | null>(null);
  const [rollbackVersionNum, setRollbackVersionNum] = useState<number | null>(null);

  const publishMutation = api.versions.publish.useMutation({
    onSuccess: () => {
      toast.success("Version published");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const rollbackMutation = api.versions.rollback.useMutation({
    onSuccess: () => {
      toast.success("Rolled back to version");
      router.refresh();
      setRollbackOpen(false);
      setRollbackVersionId(null);
    },
    onError: (error) => {
      toast.error(error.message);
      setRollbackOpen(false);
      setRollbackVersionId(null);
    },
  });

  const handleRollback = (versionId: string, versionNum: number) => {
    setRollbackVersionId(versionId);
    setRollbackVersionNum(versionNum);
    setRollbackOpen(true);
  };

  const confirmRollback = () => {
    if (rollbackVersionId) {
      rollbackMutation.mutate({ orgId, promptId, versionId: rollbackVersionId });
    }
  };

  const handlePublish = (versionId: string) => {
    publishMutation.mutate({ orgId, promptId, versionId });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Version History</h3>
        <a href={`/prompts/${promptId}/versions`} className="text-sm text-blue-600 hover:underline">
          View all
        </a>
      </div>

      {versions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No versions yet</p>
      ) : (
        <div className="space-y-2">
          {versions.map((version, idx) => (
            <div
              key={version.id}
              className={`p-3 rounded border ${
                version.id === currentVersionId ? "bg-white border-blue-300" : "bg-gray-50"
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-sm">v{version.versionNum}</span>
                <div className="flex gap-1">
                  {version.isPublished && (
                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Published</span>
                  )}
                  {version.id === currentVersionId && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Latest</span>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {version.commitMsg || "No commit message"}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(version.createdAt).toLocaleDateString()}
              </p>

              {!version.isPublished && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePublish(version.id)}
                  disabled={publishMutation.isPending}
                  className="mt-2"
                >
                  Publish
                </Button>
              )}
              {version.id !== currentVersionId && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRollback(version.id, version.versionNum)}
                  disabled={rollbackMutation.isPending}
                  className="mt-2"
                >
                  Rollback
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog.Root open={rollbackOpen} onOpenChange={setRollbackOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background rounded-lg p-6 w-full max-w-md border shadow-lg">
            <Dialog.Title className="text-lg font-semibold mb-2">Confirm Rollback</Dialog.Title>
            <Dialog.Description className="text-muted-foreground mb-6">
              This will create a new version with the content from v{rollbackVersionNum}. The current version will be preserved in history. Continue?
            </Dialog.Description>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRollbackOpen(false)}>
                Cancel
              </Button>
              <Button onClick={confirmRollback} disabled={rollbackMutation.isPending}>
                {rollbackMutation.isPending ? "Rolling back..." : "Confirm"}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}