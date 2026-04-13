"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface BillingClientProps {
  orgId: string;
  plan: "free" | "pro";
}

const FREE_FEATURES = [
  "10 active prompts",
  "3 team members",
  "5 experiments per month",
  "100 API calls per day",
  "3 attachments per prompt",
];

const PRO_FEATURES = [
  "Unlimited prompts",
  "10 team members",
  "Unlimited experiments",
  "10,000 API calls per day",
  "Unlimited attachments",
  "Priority support",
];

export function BillingClient({ orgId, plan }: BillingClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      const data = await res.json();
      if (data.url) {
        router.push(data.url);
      }
    } catch (error) {
      console.error("Upgrade error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePortal = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      const data = await res.json();
      if (data.url) {
        router.push(data.url);
      }
    } catch (error) {
      console.error("Portal error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="border rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Current Plan</h2>
            <p className="text-3xl font-bold mt-2">
              {plan === "pro" ? "Pro" : "Free"}
              <span className="text-lg font-normal text-muted-foreground">
                {plan === "pro" ? "" : " — $0/month"}
              </span>
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm ${
            plan === "pro" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
          }`}>
            {plan === "pro" ? "Active" : "Free Plan"}
          </span>
        </div>

        <div className="flex gap-3">
          {plan === "free" ? (
            <Button onClick={handleUpgrade} disabled={loading}>
              {loading ? "Loading..." : "Upgrade to Pro - $19/month"}
            </Button>
          ) : (
            <Button onClick={handlePortal} disabled={loading}>
              {loading ? "Loading..." : "Manage Subscription"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="border rounded-lg p-6">
          <h3 className="font-semibold mb-4">Free Plan</h3>
          <ul className="space-y-2">
            {FREE_FEATURES.map((feat) => (
              <li key={feat} className="flex items-center gap-2">
                <span className="text-gray-400">•</span>
                {feat}
              </li>
            ))}
          </ul>
        </div>

        <div className="border rounded-lg p-6">
          <h3 className="font-semibold mb-4">Pro Plan - $19/month</h3>
          <ul className="space-y-2">
            {PRO_FEATURES.map((feat) => (
              <li key={feat} className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                {feat}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}