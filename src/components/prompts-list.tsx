"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/trpc-client";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import * as Dialog from "@radix-ui/react-dialog";

interface Prompt {
  id: string;
  name: string;
  description: string | null;
  updatedAt: Date;
  isArchived: boolean;
  similarity?: number;
}

interface PromptsListProps {
  orgId: string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function PromptsList({ orgId }: PromptsListProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const debouncedSearch = useDebounce(search, 300);
  const hasSearchQuery = debouncedSearch.length > 0;

  const { data: prompts, isLoading: isLoadingList } = api.prompts.list.useQuery({
    orgId,
    includeArchived: showArchived,
  });

  const { data: searchResults, isLoading: isSearchingResults } = api.prompts.search.useQuery(
    { orgId, query: debouncedSearch },
    { enabled: hasSearchQuery }
  );

  const createMutation = api.prompts.create.useMutation({
    onSuccess: (prompt) => {
      setIsCreateOpen(false);
      setNewName("");
      setNewDescription("");
      toast.success("Prompt created");
      router.push(`/prompts/${prompt.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const displayPrompts = hasSearchQuery ? searchResults : prompts;
  const isLoading = hasSearchQuery ? isSearchingResults : isLoadingList;

  const filteredPrompts = displayPrompts?.filter((p) => {
    if (!showArchived && p.isArchived) return false;
    return true;
  });

  const handleCreate = () => {
    if (!newName.trim()) return;
    createMutation.mutate({ orgId, name: newName, description: newDescription || undefined });
  };

  return (
    <div>
      <div className="flex gap-4 mb-6">
        <Input
          placeholder={hasSearchQuery ? "Searching..." : "Search prompts... (Cmd+K)"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button variant="outline" onClick={() => setShowArchived(!showArchived)}>
          {showArchived ? "Hide" : "Show"} Archived
        </Button>
        <Button onClick={() => setIsCreateOpen(true)}>New Prompt</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{hasSearchQuery ? "Searching..." : "Loading prompts..."}</p>
        </div>
      ) : filteredPrompts?.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            {hasSearchQuery ? "No prompts found" : "No prompts yet"}
          </p>
          {!hasSearchQuery && (
            <Button onClick={() => setIsCreateOpen(true)}>Create your first prompt</Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPrompts?.map((prompt) => (
            <div
              key={prompt.id}
              className="border rounded-lg p-4 hover:shadow-md transition cursor-pointer"
              onClick={() => router.push(`/prompts/${prompt.id}`)}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium">{prompt.name}</h3>
                {prompt.isArchived && (
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">Archived</span>
                )}
              </div>
              {prompt.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{prompt.description}</p>
              )}
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-muted-foreground">
                  Updated {new Date(prompt.updatedAt).toLocaleDateString()}
                </p>
                {"similarity" in prompt && typeof prompt.similarity === "number" && (
                  <span className="text-xs text-primary font-medium">
                    {Math.round(prompt.similarity)}% match
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog.Root open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background rounded-lg p-6 w-full max-w-md border shadow-lg">
            <Dialog.Title className="text-lg font-semibold mb-4">Create New Prompt</Dialog.Title>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="My prompt"
                  maxLength={100}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="What is this prompt for?"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!newName.trim() || createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}