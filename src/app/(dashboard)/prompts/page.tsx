import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { orgMembers, prompts } from "@/server/db/schema";
import { db } from "@/server/db";
import { eq } from "drizzle-orm";

export default async function PromptsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const memberships = await db
    .select()
    .from(orgMembers)
    .where(eq(orgMembers.userId, session.user.id));

  if (memberships.length === 0) redirect("/onboarding");
  const orgId = memberships[0].orgId;

  const promptList = await db.query.prompts.findMany({
    where: eq(prompts.orgId, orgId),
    orderBy: (p, { desc }) => [desc(p.createdAt)],
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Prompts</h1>
        <button className="px-4 py-2 bg-black text-white rounded">New Prompt</button>
      </div>
      {promptList.length === 0 ? (
        <p className="text-muted-foreground">No prompts yet. Create your first one!</p>
      ) : (
        <div className="space-y-2">
          {promptList.map((prompt) => (
            <div key={prompt.id} className="p-4 border rounded">
              <h3 className="font-medium">{prompt.name}</h3>
              {prompt.description && (
                <p className="text-sm text-muted-foreground">{prompt.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}