import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { organizations, orgMembers } from "@/server/db/schema";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, slug } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug required" }, { status: 400 });
    }

    const [org] = await db.insert(organizations).values({
      name,
      slug,
    }).returning();

    await db.insert(orgMembers).values({
      orgId: org.id,
      userId: session.user.id,
      role: "owner",
    });

    return NextResponse.json(org);
  } catch (error) {
    console.error("[Organization Create] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}