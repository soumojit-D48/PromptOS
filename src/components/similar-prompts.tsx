"use client";

import { api } from "@/lib/trpc-client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface SimilarPrompt {
  id: string;
  name: string;
  description: string | null;
  similarity?: number;
}

interface SimilarPromptsProps {
  promptId: string;
  orgId: string;
}

export function SimilarPrompts({ promptId, orgId }: SimilarPromptsProps) {
  const router = useRouter();
  const { data: similarPrompts, isLoading } = api.prompts.similar.useQuery({ orgId, promptId }, { enabled: !!promptId });

  if (isLoading) {
    return (
      <div className="mt-4 pt-4 border-t">
        <h4 className="text-sm font-medium mb-2">Similar Prompts</h4>
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!similarPrompts || similarPrompts.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 pt-4 border-t">
      <h4 className="text-sm font-medium mb-2">Similar Prompts</h4>
      <div className="space-y-2">
        {similarPrompts.map((prompt) => (
          <div
            key={prompt.id}
            className="p-2 border rounded hover:bg-gray-50 cursor-pointer text-sm"
            onClick={() => router.push(`/prompts/${prompt.id}`)}
          >
            <div className="font-medium truncate">{prompt.name}</div>
            {typeof prompt.similarity === "number" && (
              <div className="text-xs text-primary">
                {Math.round(prompt.similarity)}% match
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}