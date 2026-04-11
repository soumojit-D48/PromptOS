"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/trpc-client";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";

interface SearchResult {
  id: string;
  name: string;
  description: string | null;
  similarity?: number;
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

interface SearchPaletteProps {
  orgId: string;
}

export function SearchPalette({ orgId }: SearchPaletteProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [localResults, setLocalResults] = useState<SearchResult[]>([]);

  const debouncedQuery = useDebounce(query, 300);
  
  const { data: searchResults } = api.prompts.search.useQuery(
    { orgId, query: debouncedQuery },
    { enabled: debouncedQuery.length > 0 && !!orgId && typeof window !== "undefined" }
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (searchResults && searchResults.length > 0) {
      setLocalResults(searchResults);
      setSelectedIndex(0);
    }
  }, [searchResults]);

  const handleSelect = (promptId: string) => {
    setIsOpen(false);
    setQuery("");
    router.push(`/prompts/${promptId}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, localResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (localResults[selectedIndex]) {
        handleSelect(localResults[selectedIndex].id);
      }
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/4 -translate-x-1/2 w-full max-w-xl bg-background rounded-lg border shadow-2xl z-50 overflow-hidden">
          <div className="p-4 border-b">
            <input
              type="text"
              placeholder="Search prompts..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full text-lg outline-none placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
          <div className="max-h-96 overflow-y-auto">
            {localResults.length === 0 && query.length > 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No prompts found
              </div>
            ) : localResults.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                Type to search prompts
              </div>
            ) : (
              localResults.map((result, index) => (
                <div
                  key={result.id}
                  className={`p-3 cursor-pointer ${
                    index === selectedIndex ? "bg-accent" : "hover:bg-accent/50"
                  }`}
                  onClick={() => handleSelect(result.id)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="font-medium">{result.name}</div>
                  {result.description && (
                    <div className="text-sm text-muted-foreground truncate">
                      {result.description}
                    </div>
                  )}
                  {typeof result.similarity === "number" && (
                    <div className="text-xs text-primary mt-1">
                      {Math.round(result.similarity)}% match
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="p-2 border-t text-xs text-muted-foreground flex justify-between">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}