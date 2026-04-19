import { db } from "@/server/db";
import { prompts, promptVersions, organizations } from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";

export default async function PublicPromptsPage() {
  const publishedPrompts = await db
    .select({
      id: promptVersions.id,
      promptId: prompts.id,
      name: prompts.name,
      description: prompts.description,
      orgId: prompts.orgId,
      orgName: organizations.name,
    })
    .from(promptVersions)
    .innerJoin(prompts, eq(promptVersions.promptId, prompts.id))
    .innerJoin(organizations, eq(prompts.orgId, organizations.id))
    .where(eq(promptVersions.isPublished, true))
    .orderBy(desc(promptVersions.createdAt));

  const uniquePrompts = publishedPrompts.reduce((acc, v) => {
    if (!acc.find((p) => p.promptId === v.promptId)) {
      acc.push(v);
    }
    return acc;
  }, [] as typeof publishedPrompts);

  return (
    <div className="container mx-auto py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Public Prompts</h1>
      <p className="text-muted-foreground mb-8">
        Browse and run prompts available via API
      </p>

      {uniquePrompts.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">No public prompts yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Publish a prompt to make it available here
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {uniquePrompts.map((prompt) => (
            <Link key={prompt.id} href={`/public/prompts/${prompt.id}`}>
              <div className="border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer h-full">
                <h2 className="text-xl font-semibold">{prompt.name}</h2>
                {prompt.description && (
                  <p className="text-muted-foreground mt-1 line-clamp-2">{prompt.description}</p>
                )}
                <p className="text-sm text-muted-foreground mt-3">
                  By {prompt.orgName}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}