"use client";

import { ABWizard } from "@/components/ab-wizard";

interface Version {
  id: string;
  versionNum: number;
  content: string;
  commitMsg: string | null;
  createdAt: string;
}

interface Props {
  promptId: string;
  orgId: string;
  promptName: string;
  versions: Version[];
}

export function NewExperimentClient({ promptId, orgId, promptName, versions }: Props) {
  const versionsAdjusted = versions.map((v) => ({
    ...v,
    createdAt: new Date(v.createdAt),
  }));

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">New Experiment</h1>
      <p className="text-muted-foreground mb-6">
        Prompt: {promptName}
      </p>
      <ABWizard
        promptId={promptId}
        orgId={orgId}
        versions={versionsAdjusted}
        open={true}
        onOpenChange={() => {}}
      />
    </div>
  );
}