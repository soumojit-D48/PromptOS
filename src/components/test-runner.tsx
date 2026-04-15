"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface TestRunnerProps {
  versionId: string;
  variables: string[];
  defaultModel: string;
}

interface RunHistory {
  id: string;
  input: Record<string, string>;
  output: string;
  model: string;
  latencyMs: number;
  timestamp: Date;
}

const FREE_MODELS = [
  { id: "nvidia/nemotron-3-super-120b-a12b:free", name: "Nemotron 3 Super 120B" },
  { id: "z-ai/glm-4.5-air:free", name: "GLM-4.5 Air" },
  { id: "openai/gpt-oss-120b:free", name: "GPT-OSS 120B" },
  { id: "nvidia/nemotron-3-nano-30b-a3b:free", name: "Nemotron 3 Nano 30B" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B" },
  { id: "google/gemma-3-27b-it:free", name: "Gemma 3 27B" },
  { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B" },
  { id: "qwen/qwen-2.5-72b-instruct:free", name: "Qwen 2.5 72B" },
  { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1" },
];

export function TestRunner({ versionId, variables, defaultModel }: TestRunnerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [modelOverride, setModelOverride] = useState(defaultModel);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState("");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [history, setHistory] = useState<RunHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const initial: Record<string, string> = {};
    variables.forEach((v) => {
      initial[v] = "";
    });
    setInputValues(initial);
  }, [variables]);

  const canRun = !versionId ? false : variables.every((v) => inputValues[v]?.trim());

  const handleRun = async () => {
    if (!versionId || !canRun || isRunning) return;

    setIsRunning(true);
    setOutput("");
    setLatencyMs(null);

    abortRef.current = new AbortController();
    const startTime = Date.now();

    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionId,
          input: inputValues,
          modelOverride: modelOverride !== defaultModel ? modelOverride : undefined,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullOutput = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullOutput += chunk;
        setOutput(fullOutput);
      }

      const endTime = Date.now();
      setLatencyMs(endTime - startTime);

      const newRun: RunHistory = {
        id: Date.now().toString(),
        input: { ...inputValues },
        output: fullOutput,
        model: modelOverride,
        latencyMs: endTime - startTime,
        timestamp: new Date(),
      };

      setHistory((prev) => [newRun, ...prev.slice(0, 9)]);

      const latencyHeader = response.headers.get("X-Latency-Ms");
      if (latencyHeader) {
        setLatencyMs(parseInt(latencyHeader, 10));
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast.error(err.message || "Failed to run prompt");
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleStop = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      setIsRunning(false);
    }
  };

  const handleLoadHistory = (run: RunHistory) => {
    setInputValues(run.input);
    setModelOverride(run.model);
    setOutput(run.output);
    setLatencyMs(run.latencyMs);
    setShowHistory(false);
  };

  return (
    <div className="border-t mt-6 pt-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm font-medium hover:text-blue-600"
      >
        <span>{isOpen ? "▼" : "▶"}</span>
        Test Runner
      </button>

      {isOpen && (
        <div className="mt-4 space-y-4">
          {variables.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {variables.map((v) => (
                <div key={v}>
                  <Label className="text-xs">{v}</Label>
                  <Input
                    value={inputValues[v] || ""}
                    onChange={(e) =>
                      setInputValues((prev) => ({ ...prev, [v]: e.target.value }))
                    }
                    placeholder={`Enter ${v}`}
                    className="mt-1"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No variables to fill</p>
          )}

          <div>
            <Label className="text-xs">Model Override</Label>
            <select
              value={modelOverride}
              onChange={(e) => setModelOverride(e.target.value)}
              className="mt-1 w-full px-3 py-2 border rounded-md"
            >
              <option value={defaultModel}>Default (from version)</option>
              {FREE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            {!isRunning ? (
              <Button onClick={handleRun} disabled={!canRun}>
                Run
              </Button>
            ) : (
              <Button variant="destructive" onClick={handleStop}>
                Stop
              </Button>
            )}
            {history.length > 0 && (
              <Button variant="outline" onClick={() => setShowHistory(!showHistory)}>
                History ({history.length})
              </Button>
            )}
          </div>

          {output && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-xs">Output</Label>
                {latencyMs !== null && (
                  <span className="text-xs text-muted-foreground">
                    {latencyMs}ms
                  </span>
                )}
              </div>
              <Textarea
                value={output}
                readOnly
                className="min-h-[150px] font-mono text-sm"
                placeholder="Output will appear here..."
              />
            </div>
          )}

          {showHistory && history.length > 0 && (
            <div className="border rounded-md">
              <div className="bg-gray-50 p-3 border-b font-medium text-sm">Run History</div>
              <div className="max-h-[200px] overflow-y-auto">
                {history.map((run) => (
                  <div
                    key={run.id}
                    className="p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleLoadHistory(run)}
                  >
                    <div className="flex justify-between text-xs">
                      <span>{run.model.split(":")[0]}</span>
                      <span className="text-muted-foreground">
                        {new Date(run.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {run.output.slice(0, 100)}...
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}