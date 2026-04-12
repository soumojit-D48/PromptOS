"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/trpc-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ApiKey {
  id: string;
  name: string;
  lastUsed: Date | null;
  createdAt: Date;
  permissions?: string | null;
}

interface ApiKeysClientProps {
  orgId: string;
}

export function ApiKeysClient({ orgId }: ApiKeysClientProps) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyPermission, setNewKeyPermission] = useState<"execute" | "read">("execute");
  const [revealedKey, setRevealedKey] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const { data: listData, refetch } = api.apiKeys.list.useQuery(
    { orgId },
    { enabled: !!orgId }
  );

  useEffect(() => {
    if (listData) {
      setKeys(listData as ApiKey[]);
      setIsLoading(false);
    }
  }, [listData]);

  const createMutation = api.apiKeys.create.useMutation({
    onSuccess: (data) => {
      setRevealedKey(data.plainKey);
      setShowCreate(false);
      setNewKeyName("");
      refetch();
      toast.success("API key created successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const revokeMutation = api.apiKeys.revoke.useMutation({
    onSuccess: () => {
      toast.success("API key revoked");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreate = () => {
    if (!newKeyName) {
      toast.error("Please enter a key name");
      return;
    }
    createMutation.mutate({ orgId, name: newKeyName, permissions: newKeyPermission });
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">API Keys</h1>
        <p className="text-muted-foreground mt-2">
          Manage API keys for external access to your prompts
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Keys</CardTitle>
          <CardDescription>
            These keys can be used to access your prompts via the API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-muted-foreground py-4">Loading...</p>
          ) : keys.length === 0 ? (
            <p className="text-muted-foreground py-4">
              No API keys yet. Create one to get started.
            </p>
          ) : (
            keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between border-b pb-4 last:border-0"
              >
                <div>
                  <p className="font-medium">{key.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Created {new Date(key.createdAt).toLocaleDateString()}
                    {key.lastUsed && ` • Last used ${new Date(key.lastUsed).toLocaleDateString()}`}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => revokeMutation.mutate({ orgId, keyId: key.id })}
                >
                  Revoke
                </Button>
              </div>
            ))
          )}

          {!showCreate ? (
            <Button onClick={() => setShowCreate(true)}>Create API Key</Button>
          ) : (
            <div className="space-y-4 border p-4 rounded">
              <div>
                <Label htmlFor="keyName">Key Name</Label>
                <Input
                  id="keyName"
                  placeholder="e.g., Production app"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="permissions">Permissions</Label>
                <select
                  className="w-full p-2 border rounded"
                  value={newKeyPermission}
                  onChange={(e) => setNewKeyPermission(e.target.value as "execute" | "read")}
                >
                  <option value="execute">Execute only</option>
                  <option value="read">Read + Execute</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating..." : "Create Key"}
                </Button>
                <Button variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {revealedKey && (
            <div className="border border-yellow-500 bg-yellow-50 p-4 rounded">
              <p className="font-medium text-yellow-800 mb-2">API Key Created</p>
              <p className="text-sm text-yellow-700 mb-2">
                Copy this key now. You won&apos;t be able to see it again!
              </p>
              <div className="p-2 bg-white rounded font-mono text-sm break-all mb-2">
                {revealedKey}
              </div>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(revealedKey);
                  toast.success("Copied to clipboard");
                }}
              >
                Copy
              </Button>{" "}
              <Button variant="outline" onClick={() => setRevealedKey("")}>
                Done
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}