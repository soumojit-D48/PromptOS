"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
  const [loading, setLoading] = useState(false);

  // Step 1: Organization
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [orgId, setOrgId] = useState("");

  // Step 2: Prompt
  const [promptName, setPromptName] = useState("");
  const [promptDesc, setPromptDesc] = useState("");
  const [promptId, setPromptId] = useState("");

  // Step 3: Version
  const [commitMsg, setCommitMsg] = useState("Initial version");

  const handleOrgNameChange = (name: string) => {
    setOrgName(name);
    setOrgSlug(generateSlug(name));
  };

  const createOrg = async () => {
    if (!orgName.trim() || !orgSlug.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/trpc/organization.create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName, slug: orgSlug }),
      });
      const data = await res.json();
      if (data.result?.data?.json?.id) {
        setOrgId(data.result.data.json.id);
        setStep(2);
      }
    } catch (e) {
      console.error("Failed to create org:", e);
    } finally {
      setLoading(false);
    }
  };

  const createPrompt = async () => {
    if (!promptName.trim() || !orgId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/trpc/prompts.create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          name: promptName,
          description: promptDesc,
        }),
      });
      const data = await res.json();
      if (data.result?.data?.json?.id) {
        setPromptId(data.result.data.json.id);
        setStep(3);
      }
    } catch (e) {
      console.error("Failed to create prompt:", e);
    } finally {
      setLoading(false);
    }
  };

  const saveVersion = async () => {
    if (!promptId || !orgId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/trpc/versions.create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          promptId,
          content: STARTER_PROMPT,
          model: "meta-llama/llama-3.3-70b-instruct:free",
          params: {
            temperature: 0.7,
            maxTokens: 2048,
          },
          commitMsg,
        }),
      });
      const data = await res.json();
      if (data.result?.data?.json?.id) {
        router.push(`/prompts/${promptId}`);
      }
    } catch (e) {
      console.error("Failed to save version:", e);
    } finally {
      setLoading(false);
    }
  };

  const skipStep = (next: number) => {
    setStep(next);
  };

  return (
    <div className="max-w-xl mx-auto py-12">
      {/* Progress */}
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

      {/* Step 1: Organization */}
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
              <Button onClick={createOrg} disabled={loading || !orgName.trim()}>
                {loading ? "Creating..." : "Continue"}
              </Button>
              <Button variant="ghost" onClick={() => router.push("/prompts")}>
                Skip
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: First Prompt */}
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
              <Button onClick={createPrompt} disabled={loading || !promptName.trim()}>
                {loading ? "Creating..." : "Continue"}
              </Button>
              <Button variant="ghost" onClick={() => skipStep(3)}>
                Skip
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Save Version */}
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
              <p className="text-sm font-muted-foreground">Preview:</p>
              <pre className="text-sm mt-2 whitespace-pre-wrap">
                {STARTER_PROMPT}
              </pre>
            </div>
            <div className="flex gap-3">
              <Button onClick={saveVersion} disabled={loading}>
                {loading ? "Saving..." : "Save & Finish"}
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