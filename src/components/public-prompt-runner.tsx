"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface PublicPromptRunnerProps {
  prompt: {
    id: string;
    name: string;
    description: string | null;
    content: string;
    model: string;
    params: { temperature: number; maxTokens: number; systemPrompt?: string };
  };
}

export function PublicPromptRunner({ prompt }: PublicPromptRunnerProps) {
  const [apiKey, setApiKey] = useState("");
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState("");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const variables = useMemo(() => {
    const matches = prompt.content.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")))];
  }, [prompt.content]);

  const canRun = variables.every((v) => inputValues[v]?.trim()) && apiKey.trim();

  const handleRun = async () => {
    if (!canRun || isRunning) return;

    setIsRunning(true);
    setOutput("");
    setLatencyMs(null);

    try {
      const response = await fetch('/api/v1/execute', {
        method: 'POST',
        headers: { 
          "Content-Type": "application/json",
          "X-API-Key": apiKey.trim()
        },
        body: JSON.stringify({
          promptId: prompt.id,
          input: inputValues,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setOutput(data.text);
      setLatencyMs(data.latencyMs);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{prompt.name}</h1>
        {prompt.description && (
          <p className="text-muted-foreground mt-1">{prompt.description}</p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your API Key</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="password"
                placeholder="pk_live_xxx"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Get your API key from the prompt owner
              </p>
            </CardContent>
          </Card>

          {variables.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Input Variables</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {variables.map((v) => (
                  <div key={v}>
                    <label className="text-sm font-medium capitalize block mb-1">{v}</label>
                    <Input
                      placeholder={`Enter ${v}`}
                      value={inputValues[v] || ""}
                      onChange={(e) =>
                        setInputValues((prev) => ({ ...prev, [v]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Button 
            onClick={handleRun} 
            disabled={!canRun || isRunning}
            className="w-full"
          >
            {isRunning ? "Running..." : "Run Prompt"}
          </Button>
        </div>

        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">Prompt</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg overflow-auto max-h-[500px]">
                {prompt.content}
              </pre>
              {prompt.params.systemPrompt && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-1">System Prompt:</p>
                  <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
                    {prompt.params.systemPrompt}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {output && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg flex justify-between items-center">
              Response
              {latencyMs && (
                <span className="text-sm font-normal text-muted-foreground">
                  {latencyMs}ms
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm">{output}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}