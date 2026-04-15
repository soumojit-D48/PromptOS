"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/trpc-client";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import * as Dialog from "@radix-ui/react-dialog";
import { TestRunner } from "./test-runner";

interface Version {
  id: string;
  versionNum: number;
  content: string;
  model: string;
  params: Record<string, unknown>;
  isPublished: boolean;
  commitMsg: string | null;
  createdAt: Date;
}

interface Prompt {
  id: string;
  name: string;
  description: string | null;
  isArchived: boolean;
}

interface PromptEditorProps {
  prompt: Prompt;
  orgId: string;
  latestVersion?: Version;
  publishedVersion?: Version;
  onVersionCreated?: (version: Version) => void;
}

const FREE_MODELS = [
  { id: "nvidia/nemotron-3-super-120b-a12b:free", name: "Nemotron 3 Super 120B" },
  { id: "z-ai/glm-4.5-air:free", name: "GLM-4.5 Air" },
  { id: "openai/gpt-oss-120b:free", name: "GPT-OSS 120B" },
  { id: "nvidia/nemotron-3-nano-30b-a3b:free", name: "Nemotron 3 Nano 30B" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B" },
  { id: "google/gemma-3-27b-it:free", name: "Gemma 3 27B" },
  { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B" }, // nvidia/nemotron-3-super-120b-a12b:free
  { id: "qwen/qwen-2.5-72b-instruct:free", name: "Qwen 2.5 72B" },
  { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1" }, //arcee-ai/trinity-large-preview:free
];

export function PromptEditor({ prompt, orgId, latestVersion, publishedVersion, onVersionCreated }: PromptEditorProps) {
  const router = useRouter();
  const initialParams = latestVersion?.params as { temperature?: number; maxTokens?: number; systemPrompt?: string } | undefined;
  const [content, setContent] = useState(latestVersion?.content || "");
  const [systemPrompt, setSystemPrompt] = useState(initialParams?.systemPrompt || "");
  const [model, setModel] = useState(latestVersion?.model || "nvidia/nemotron-3-super-120b-a12b:free");
  const [temperature, setTemperature] = useState(initialParams?.temperature ?? 0.7);
  const [maxTokens, setMaxTokens] = useState(initialParams?.maxTokens ?? 1000);
  const [commitMsg, setCommitMsg] = useState("");
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const createVersion = api.versions.create.useMutation({
    onSuccess: (version) => {
      setIsSaveOpen(false);
      setCommitMsg("");
      toast.success("Version saved");
      setHasChanges(false);
      const params = version.params as { temperature: number; maxTokens: number; systemPrompt?: string };
      setContent(version.content);
      setModel(version.model);
      setTemperature(params?.temperature ?? 0.7);
      setMaxTokens(params?.maxTokens ?? 1000);
      setSystemPrompt(params?.systemPrompt || "");
      const versionWithDate: Version = {
        id: version.id,
        versionNum: version.versionNum,
        content: version.content,
        model: version.model,
        params: params || { temperature: 0.7, maxTokens: 1000 },
        isPublished: version.isPublished,
        commitMsg: version.commitMsg,
        createdAt: new Date(version.createdAt),
      };
      if (onVersionCreated) {
        onVersionCreated(versionWithDate);
      } else {
        router.refresh();
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  useEffect(() => {
    if (latestVersion) {
      const params = latestVersion.params as { temperature?: number; maxTokens?: number; systemPrompt?: string } | undefined;
      setContent(latestVersion.content);
      setModel(latestVersion.model);
      setTemperature(params?.temperature ?? 0.7);
      setMaxTokens(params?.maxTokens ?? 1000);
      setSystemPrompt(params?.systemPrompt || "");
    }
  }, [latestVersion]);

  useEffect(() => {
    if (latestVersion) {
      const params = latestVersion.params as { temperature?: number; maxTokens?: number; systemPrompt?: string } | undefined;
      setHasChanges(
        content !== latestVersion.content ||
        model !== latestVersion.model ||
        temperature !== (params?.temperature ?? 0.7) ||
        maxTokens !== (params?.maxTokens ?? 1000) ||
        systemPrompt !== (params?.systemPrompt || "")
      );
    } else {
      setHasChanges(content.trim().length > 0);
    }
  }, [content, model, temperature, maxTokens, systemPrompt, latestVersion]);

  const variables = useMemo(() => {
    const matches = content.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")))];
  }, [content]);

  const charCount = content.length;
  const tokenEstimate = Math.ceil(charCount / 4);

  const handleSave = () => {
    createVersion.mutate({
      orgId,
      promptId: prompt.id,
      content,
      model,
      params: { temperature, maxTokens, systemPrompt },
      commitMsg: commitMsg || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{prompt.name}</h1>
          {prompt.description && <p className="text-muted-foreground">{prompt.description}</p>}
        </div>
        {hasChanges && (
          <span className="text-sm text-yellow-600 bg-yellow-50 px-2 py-1 rounded">Unsaved changes</span>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <Label>Model</Label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-md"
            >
              {FREE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Temperature</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Max Tokens</Label>
              <Input
                type="number"
                min="1"
                max="4096"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        <div>
          <Label>System Prompt (optional)</Label>
          <Textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Additional instructions for the model..."
            className="mt-1"
            rows={3}
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <Label>Prompt Content</Label>
          <span className="text-sm text-muted-foreground">
            {charCount} chars · ~{tokenEstimate} tokens
          </span>
        </div>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your prompt here. Use {{variable}} for dynamic content..."
          className="min-h-[300px] font-mono"
        />
        {variables.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {variables.map((v) => (
              <span key={v} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                {`{{${v}}}`}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setIsSaveOpen(true)} disabled={!hasChanges || createVersion.isPending}>
          {createVersion.isPending ? "Saving..." : "Save Version"}
        </Button>
      </div>

      <TestRunner versionId={latestVersion?.id || ""} variables={variables} defaultModel={model} />

      <Dialog.Root open={isSaveOpen} onOpenChange={setIsSaveOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background rounded-lg p-6 w-full max-w-md border shadow-lg">
            <Dialog.Title className="text-lg font-semibold mb-4">Save Version</Dialog.Title>
            <div>
              <Label>Commit Message (optional)</Label>
              <Textarea
                value={commitMsg}
                onChange={(e) => setCommitMsg(e.target.value.slice(0, 140))}
                placeholder="Describe your changes..."
                className="mt-1"
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">{commitMsg.length}/140</p>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsSaveOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={createVersion.isPending}>
                {createVersion.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}