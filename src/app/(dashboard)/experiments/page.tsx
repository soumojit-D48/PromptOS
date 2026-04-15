import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { orgMembers, organizations, experiments, prompts } from "@/server/db/schema";
import { db } from "@/server/db";
import { eq, and, desc } from "drizzle-orm";
import Link from "next/link";

export default async function ExperimentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const memberships = await db
    .select()
    .from(orgMembers)
    .where(eq(orgMembers.userId, session.user.id));

  if (memberships.length === 0) redirect("/onboarding");

  const cookieStore = await cookies();
  const currentOrgIdCookie = cookieStore.get("currentOrgId")?.value;

  let orgId = memberships[0].orgId;
  if (currentOrgIdCookie) {
    const hasMembership = memberships.find(m => m.orgId === currentOrgIdCookie);
    if (hasMembership) {
      orgId = currentOrgIdCookie;
    }
  }

  const orgPrompts = await db.query.prompts.findMany({
    where: eq(prompts.orgId, orgId),
  });
  const promptIds = orgPrompts.map(p => p.id);

  const allExperiments = await db.query.experiments.findMany({
    where: promptIds.length > 0 ? eq(experiments.promptId, promptIds[0]) : undefined,
    orderBy: [desc(experiments.createdAt)],
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Experiments</h1>
      </div>

      {allExperiments.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <div className="text-4xl mb-4">🧪</div>
          <p className="text-lg font-medium">No experiments yet</p>
          <p className="text-sm text-muted-foreground mt-2 mb-4">
            Run your first A/B test to compare prompt versions
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {allExperiments.map((experiment) => (
            <Link
              key={experiment.id}
              href={`/experiments/${experiment.id}`}
              className="block p-4 border rounded hover:bg-gray-50"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{experiment.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Status: {experiment.status}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  experiment.status === "running" ? "bg-blue-100 text-blue-800" :
                  experiment.status === "done" ? "bg-green-100 text-green-800" :
                  "bg-gray-100 text-gray-800"
                }`}>
                  {experiment.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}