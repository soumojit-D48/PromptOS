import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { organizations, orgMembers } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { BillingClient } from "./billing-client";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return <div>Please sign in</div>;
  }

  const params = await searchParams;
  
  const memberships = await db
    .select()
    .from(orgMembers)
    .where(eq(orgMembers.userId, session.user.id));

  if (memberships.length === 0) {
    return <div>No organization found</div>;
  }

  const orgId = memberships[0].orgId;
  
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
  });

  const showSuccess = params.success === "true";
  const showCanceled = params.canceled === "true";

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Billing</h1>
      
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800">Successfully upgraded to Pro plan!</p>
        </div>
      )}
      
      {showCanceled && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">Checkout was canceled. You remain on the free plan.</p>
        </div>
      )}

      <BillingClient orgId={orgId} plan={org?.plan || "free"} />
    </div>
  );
}