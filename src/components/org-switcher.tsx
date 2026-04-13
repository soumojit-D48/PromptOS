"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/trpc-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface OrgSwitcherProps {
  currentOrgId: string;
  currentOrgName: string;
  organizations: Organization[];
}

export function OrgSwitcher({
  currentOrgId,
  currentOrgName,
  organizations,
}: OrgSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleOrgSelect = (orgId: string) => {
    setIsOpen(false);
    const cookiePath = `/api/org-switch?orgId=${orgId}`;
    document.cookie = `currentOrgId=${orgId}; path=/; max-age=2592000`;
    router.refresh();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 w-full text-left"
      >
        <Avatar className="h-6 w-6">
          <AvatarFallback className="text-xs">
            {currentOrgName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium truncate">{currentOrgName}</span>
        <svg
          className="w-4 h-4 ml-auto"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 border rounded-lg bg-white shadow-lg z-50">
          <div className="p-2">
            <div className="text-xs text-muted-foreground px-2 py-1">
              Switch organization
            </div>
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => handleOrgSelect(org.id)}
                className={`w-full text-left px-2 py-1.5 rounded hover:bg-gray-100 flex items-center gap-2 ${
                  org.id === currentOrgId ? "bg-gray-100" : ""
                }`}
              >
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-xs">
                    {org.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{org.name}</span>
              </button>
            ))}
          </div>
          <div className="border-t p-2">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push("/onboarding?create=true");
              }}
              className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-100 text-sm text-muted-foreground"
            >
              + Create new organization
            </button>
          </div>
        </div>
      )}
    </div>
  );
}