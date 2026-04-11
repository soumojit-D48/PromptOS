"use client";

import { api } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handlePublish = (versionId: string) => {
    publishMutation.mutate({ orgId, promptId, versionId });
  };

  const handleRollback = (versionId: string) => {
    if (confirm("This will create a new version with the content from this version. Continue?")) {
      rollbackMutation.mutate({ orgId, promptId, versionId });
    }
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

              {!version.isPublished && versions.length - idx > 1 && (
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePublish(version.id)}
                    disabled={publishMutation.isPending}
                  >
                    Publish
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRollback(version.id)}
                    disabled={rollbackMutation.isPending}
                  >
                    Rollback
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}