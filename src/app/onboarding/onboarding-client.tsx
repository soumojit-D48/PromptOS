"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/trpc-client";

interface OnboardingClientProps {
  userId: string;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const STARTER_PROMPT = `You are a helpful AI assistant.

Your task is to help the user with their request.
Be clear, concise, and accurate in your responses.`;

export function OnboardingClient({ userId }: OnboardingClientProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [orgId, setOrgId] = useState("");

  const [promptName, setPromptName] = useState("");
  const [promptDesc, setPromptDesc] = useState("");
  const [promptId, setPromptId] = useState("");

  const [commitMsg, setCommitMsg] = useState("Initial version");

  const createOrgMutation = api.organization.create.useMutation({
    onSuccess: (org) => {
      setOrgId(org.id);
      setStep(2);
    },
    onError: (e) => {
      console.error("Failed to create org:", e);
    },
  });

  const createPromptMutation = api.prompts.create.useMutation({
    onSuccess: (prompt) => {
      setPromptId(prompt.id);
      setStep(3);
    },
    onError: (e) => {
      console.error("Failed to create prompt:", e);
    },
  });

  const saveVersionMutation = api.versions.create.useMutation({
    onSuccess: () => {
      router.push(`/prompts/${promptId}`);
    },
    onError: (e) => {
      console.error("Failed to save version:", e);
    },
  });

  const handleOrgNameChange = (name: string) => {
    setOrgName(name);
    setOrgSlug(generateSlug(name));
  };

  const createOrg = () => {
    if (!orgName.trim() || !orgSlug.trim()) return;
    createOrgMutation.mutate({ name: orgName, slug: orgSlug });
  };

  const createPrompt = () => {
    if (!promptName.trim() || !orgId) return;
    createPromptMutation.mutate({ orgId, name: promptName, description: promptDesc });
  };

  const saveVersion = () => {
    if (!promptId || !orgId) return;
    saveVersionMutation.mutate({
      orgId,
      promptId,
      content: STARTER_PROMPT,
      model: "meta-llama/llama-3.3-70b-instruct:free",
      params: { temperature: 0.7, maxTokens: 2048 },
      commitMsg,
    });
  };

  const skipStep = (next: number) => {
    setStep(next);
  };

  return (
    <div className="max-w-xl mx-auto py-12">
      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`flex-1 h-2 rounded ${
              s === step ? "bg-primary" : s < step ? "bg-primary/50" : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Create Your Organization</CardTitle>
            <CardDescription>
              This is where your team will collaborate on prompts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Organization Name</Label>
              <Input
                value={orgName}
                onChange={(e) => handleOrgNameChange(e.target.value)}
                placeholder="My AI Team"
                className="mt-1"
              />
            </div>
            <div>
              <Label>URL Slug</Label>
              <Input
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value)}
                placeholder="my-ai-team"
                className="mt-1"
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={createOrg} disabled={createOrgMutation.isPending || !orgName.trim()}>
                {createOrgMutation.isPending ? "Creating..." : "Continue"}
              </Button>
              <Button variant="ghost" onClick={() => router.push("/prompts")}>
                Skip
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Create Your First Prompt</CardTitle>
            <CardDescription>
              Give your prompt a name and description
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Prompt Name</Label>
              <Input
                value={promptName}
                onChange={(e) => setPromptName(e.target.value)}
                placeholder="Assistant Bot"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input
                value={promptDesc}
                onChange={(e) => setPromptDesc(e.target.value)}
                placeholder="A helpful AI assistant"
                className="mt-1"
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={createPrompt} disabled={createPromptMutation.isPending || !promptName.trim()}>
                {createPromptMutation.isPending ? "Creating..." : "Continue"}
              </Button>
              <Button variant="ghost" onClick={() => skipStep(3)}>
                Skip
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Save Your First Version</CardTitle>
            <CardDescription>
              We&apos;ll pre-fill a starter template for you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Commit Message</Label>
              <Input
                value={commitMsg}
                onChange={(e) => setCommitMsg(e.target.value)}
                placeholder="Initial version"
                className="mt-1"
              />
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Preview:</p>
              <pre className="text-sm mt-2 whitespace-pre-wrap">
                {STARTER_PROMPT}
              </pre>
            </div>
            <div className="flex gap-3">
              <Button onClick={saveVersion} disabled={saveVersionMutation.isPending}>
                {saveVersionMutation.isPending ? "Saving..." : "Save & Finish"}
              </Button>
              <Button variant="ghost" onClick={() => router.push("/prompts")}>
                Skip
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}