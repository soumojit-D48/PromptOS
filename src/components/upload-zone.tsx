"use client";

import { useState } from "react";
import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

const { useUploadThing, uploadFiles } = generateReactHelpers<OurFileRouter>();

interface Attachment {
  id: string;
  url: string;
  name: string;
  size: number;
  type: string;
}

interface UploadZoneProps {
  orgId: string;
  promptId: string;
  role: "owner" | "editor" | "viewer";
  attachments: Attachment[];
  onUploadComplete: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getFileIcon(type: string): string {
  if (type.includes("pdf")) return "📄";
  if (type.includes("image")) return "🖼️";
  if (type.includes("text")) return "📝";
  if (type.includes("json")) return "📋";
  return "📎";
}

export function UploadZone({
  orgId,
  promptId,
  role,
  attachments,
  onUploadComplete,
}: UploadZoneProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { startUpload } = useUploadThing("promptAttachment");

  const canUpload = role === "owner" || role === "editor";
  const maxAttachments = 3;
  const canAddMore = canUpload && attachments.length < maxAttachments;

  const handleUpload = async (files: File[]) => {
    setIsUploading(true);
    try {
      const results = await startUpload(files);
      
      if (results) {
        for (const file of results) {
          await fetch("/api/trpc/prompts.attachments.create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orgId,
              promptId,
              url: file.url,
              name: file.name,
              size: file.size,
              type: file.type,
            }),
          });
        }
      }
      
      onUploadComplete();
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    await fetch("/api/trpc/prompts.attachments.delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, attachmentId }),
    });

    onUploadComplete();
  };

  return (
    <div className="space-y-4">
      {canAddMore && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            multiple={false}
            accept=".pdf,.txt,.md,.json,.png,.jpg,.jpeg"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length > 0) {
                handleUpload(files);
              }
            }}
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer block"
          >
            {isUploading ? (
              <span className="text-gray-500">Uploading...</span>
            ) : (
              <span className="text-gray-600">
                Click to upload files (PDF, TXT, MD, JSON, PNG, JPG)
              </span>
            )}
          </label>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">
            {attachments.length} of {maxAttachments} attachments
          </div>
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-2 border rounded"
            >
              <div className="flex items-center gap-2">
                <span>{getFileIcon(attachment.type)}</span>
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:underline"
                >
                  {attachment.name}
                </a>
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.size)}
                </span>
              </div>
              {canUpload && (
                <button
                  onClick={() => handleDelete(attachment.id)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}