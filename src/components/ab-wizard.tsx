"use client";

import { useState } from "react";
import { api } from "@/lib/trpc-client";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { getFeatureFlag } from "@/lib/track";

interface ExperimentVersion {
  id: string;
  versionNum: number;
  content: string;
  commitMsg: string | null;
  createdAt: Date;
}

interface ABWizardProps {
  promptId: string;
  orgId: string;
  versions: ExperimentVersion[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ABWizard({ promptId, orgId, versions, open, onOpenChange }: ABWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [trafficSplit, setTrafficSplit] = useState<Record<string, number>>({});
  const [inputsJson, setInputsJson] = useState("[\n  {}\n]");
  const [scoringRubric, setScoringRubric] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const enableScoring = getFeatureFlag("ab-scoring-enabled");

  const createMutation = api.experiments.create.useMutation();
  const startMutation = api.experiments.start.useMutation();

  const totalSelected = selectedVersions.length;

  const toggleVersion = (versionId: string) => {
    console.log("DEBUG toggleVersion:", versionId);
    if (selectedVersions.includes(versionId)) {
      setSelectedVersions(selectedVersions.filter(id => id !== versionId));
      const newSplit = { ...trafficSplit };
      delete newSplit[versionId];
      setTrafficSplit(newSplit);
    } else if (selectedVersions.length < 4) {
      setSelectedVersions([...selectedVersions, versionId]);
      const newSplit = { ...trafficSplit, [versionId]: 100 / (selectedVersions.length + 1) };
      console.log("DEBUG newSplit:", newSplit);
      setTrafficSplit(adjustSplitValues(newSplit, selectedVersions.length + 1));
    }
  };

  const adjustSplitValues = (split: Record<string, number>, count: number): Record<string, number> => {
    const equalValue = Math.floor(100 / count);
    const remainder = 100 - equalValue * count;
    const result: Record<string, number> = {};
    let i = 0;
    for (const key of Object.keys(split)) {
      result[key] = equalValue + (i < remainder ? 1 : 0);
      i++;
    }
    return result;
  };

  const updateSplit = (versionId: string, value: number) => {
    const newSplit = { ...trafficSplit, [versionId]: value };
    setTrafficSplit(newSplit);
  };

  const getSplitSum = () => Object.values(trafficSplit).reduce((a, b) => a + b, 0);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      let inputs: Record<string, string>[] = [];
      try {
        inputs = JSON.parse(inputsJson);
      } catch {
        alert("Invalid JSON format for inputs");
        return;
      }

      if (inputs.length < 2 || inputs.length > 100) {
        alert("Inputs must be between 2 and 100");
        return;
      }

      const experiment = await createMutation.mutateAsync({
        orgId,
        promptId,
        name,
        trafficSplit,
        inputs,
        enableScoring,
        scoringRubric: enableScoring ? scoringRubric : undefined,
      });

      await startMutation.mutateAsync({
        orgId,
        experimentId: experiment.id,
      });

      onOpenChange(false);
      router.push(`/experiments/${experiment.id}`);
      // window.location.href = `/experiments/${experiment.id}`;
    } catch (error) {
      console.error("Failed to start experiment:", error);
      alert("Failed to start experiment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeAndReset = () => {
    onOpenChange(false);
setTimeout(() => {
        setStep(1);
        setName("");
        setSelectedVersions([]);
        setTrafficSplit({});
        setInputsJson("[\n  {}\n]");
        setScoringRubric("");
      }, 300);
  };

  const publishedVersions = versions;
  const canProceed = step === 1 
    ? name.trim() && selectedVersions.length >= 2
    : step === 2 
    ? getSplitSum() === 100
    : step === 3 
    ? true
    : true;

  return (
    <Dialog.Root open={open} onOpenChange={closeAndReset}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] bg-background rounded-lg border shadow-2xl z-50 overflow-hidden">
          <div className="p-6 border-b">
            <Dialog.Title className="text-xl font-semibold">Create A/B Experiment</Dialog.Title>
            <div className="flex gap-2 mt-4">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className={`flex-1 h-2 rounded ${s === step ? "bg-primary" : s < step ? "bg-primary/50" : "bg-gray-200"}`} />
              ))}
            </div>
            <div className="text-sm text-muted-foreground mt-2">Step {step} of 4</div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label>Experiment Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Compare temperature settings"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Select Versions (2-4)</Label>
                  <div className="mt-2 space-y-2">
                    {publishedVersions.map((version) => (
                      <div
                        key={version.id}
                        onClick={() => toggleVersion(version.id)}
                        className={`p-3 border rounded cursor-pointer ${
                          selectedVersions.includes(version.id) ? "border-primary bg-primary/5" : "hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedVersions.includes(version.id)}
                            onChange={() => {}}
                          />
                          <span className="font-medium">v{version.versionNum}</span>
                          {version.commitMsg && (
                            <span className="text-muted-foreground">- {version.commitMsg}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {publishedVersions.length < 2 && (
                    <p className="text-sm text-red-500 mt-2">At least 2 versions required</p>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <Label>Traffic Split (%)</Label>
                {selectedVersions.map((versionId) => {
                  const version = versions.find(v => v.id === versionId);
                  return (
                    <div key={versionId} className="flex items-center gap-4">
                      <span className="w-16">v{version?.versionNum}</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={trafficSplit[versionId] || 0}
                        onChange={(e) => updateSplit(versionId, parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <span className="w-12 text-right">{trafficSplit[versionId] || 0}%</span>
                    </div>
                  );
                })}
                <div className="pt-4 border-t">
                  <div className={`text-lg ${getSplitSum() === 100 ? "text-green-600" : "text-red-500"}`}>
                    Total: {getSplitSum()}% {getSplitSum() !== 100 && "(must be 100%)"}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <Label>Test Inputs (JSON Array)</Label>
                  <p className="text-sm text-muted-foreground mb-2">Minimum 2, maximum 100 inputs</p>
                  <textarea
                    value={inputsJson}
                    onChange={(e) => setInputsJson(e.target.value)}
                    className="w-full h-48 p-3 border rounded font-mono text-sm"
                    placeholder='[{"input": "value"}, {"input": "value"}]'
                  />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <Label>Enable AI Scoring</Label>
                  <p className="text-sm text-muted-foreground mb-2">Use AI to score outputs on a 1-5 scale</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={enableScoring}
                      disabled={true}
                    />
                    <span>Enable AI scoring</span>
                  </div>
                </div>
                {enableScoring && (
                  <div>
                    <Label>Scoring Rubric</Label>
                    <textarea
                      value={scoringRubric}
                      onChange={(e) => setScoringRubric(e.target.value)}
                      className="w-full h-24 p-3 border rounded text-sm mt-1"
                      placeholder="Describe how outputs should be evaluated..."
                    />
                  </div>
                )}
                <div className="pt-4 border-t">
                  <h3 className="font-medium mb-2">Summary</h3>
                  <p><strong>Name:</strong> {name}</p>
                  <p><strong>Versions:</strong> {selectedVersions.length} (v{versions.filter(v => selectedVersions.includes(v.id)).map(v => v.versionNum).join(", v")})</p>
                  <p><strong>Traffic Split:</strong> {getSplitSum()}%</p>
                  <p><strong>AI Scoring:</strong> {enableScoring ? "Enabled" : "Disabled"}</p>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t flex justify-between">
            <Button variant="outline" onClick={() => step > 1 && setStep(step - 1)} disabled={step === 1}>
              Back
            </Button>
            {step < 4 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed}>
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Starting..." : "Start Experiment"}
              </Button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}