"use client";

import { useState } from "react";

interface Version {
  id: string;
  versionNum: number;
  content: string;
  commitMsg: string | null;
  createdAt: Date;
  isPublished: boolean;
}

interface VersionDiffProps {
  versions: Version[];
}

export function VersionDiff({ versions }: VersionDiffProps) {
  const [versionAId, setVersionAId] = useState(versions[1]?.id || versions[0]?.id);
  const [versionBId, setVersionBId] = useState(versions[0]?.id);

  const versionA = versions.find((v) => v.id === versionAId);
  const versionB = versions.find((v) => v.id === versionBId);

  const diff: { type: "added" | "removed" | "unchanged"; line: string }[] = [];
  if (versionA && versionB) {
    const linesA = versionA.content.split("\n");
    const linesB = versionB.content.split("\n");
    const maxLen = Math.max(linesA.length, linesB.length);
    
    for (let i = 0; i < maxLen; i++) {
      const lineA = linesA[i];
      const lineB = linesB[i];
      
      if (lineA === undefined) {
        diff.push({ type: "added", line: lineB });
      } else if (lineB === undefined) {
        diff.push({ type: "removed", line: lineA });
      } else if (lineA === lineB) {
        diff.push({ type: "unchanged", line: lineA });
      } else {
        diff.push({ type: "removed", line: lineA });
        diff.push({ type: "added", line: lineB });
      }
    }
  }

  if (versions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No versions saved yet</p>
      </div>
    );
  }

  if (versions.length === 1) {
    return (
      <div className="space-y-4">
        <div className="bg-muted p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">v{versions[0].versionNum}</span>
            {versions[0].isPublished && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Published</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {versions[0].commitMsg || "No commit message"}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(versions[0].createdAt).toLocaleString()}
          </p>
          <pre className="mt-4 whitespace-pre-wrap text-sm bg-background p-4 rounded border overflow-x-auto">
            {versions[0].content}
          </pre>
        </div>
        <p className="text-center text-muted-foreground text-sm">
          Save another version to compare
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div>
          <label className="text-sm font-medium">Version A (older)</label>
          <select
            value={versionAId}
            onChange={(e) => setVersionAId(e.target.value)}
            className="mt-1 block w-full rounded-md border px-3 py-2"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                v{v.versionNum} - {new Date(v.createdAt).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Version B (newer)</label>
          <select
            value={versionBId}
            onChange={(e) => setVersionBId(e.target.value)}
            className="mt-1 block w-full rounded-md border px-3 py-2"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                v{v.versionNum} - {new Date(v.createdAt).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-50 border-b p-3 flex justify-between text-sm">
          <span>v{versionA?.versionNum}</span>
          <span>v{versionB?.versionNum}</span>
        </div>
        <div className="font-mono text-sm">
          {diff.map((item, idx) => (
            <div
              key={idx}
              className={`px-3 py-0.5 ${
                item.type === "added"
                  ? "bg-green-50 text-green-700"
                  : item.type === "removed"
                  ? "bg-red-50 text-red-700"
                  : ""
              }`}
            >
              {item.type === "added" && "+ "}
              {item.type === "removed" && "- "}
              {item.line}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium">All Versions</h3>
        {versions.map((v) => (
          <div key={v.id} className="flex justify-between items-center p-3 border rounded">
            <div>
              <span className="font-medium">v{v.versionNum}</span>
              {v.isPublished && (
                <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Published</span>
              )}
              <p className="text-sm text-muted-foreground">{v.commitMsg || "No commit message"}</p>
            </div>
            <span className="text-sm text-muted-foreground">
              {new Date(v.createdAt).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}