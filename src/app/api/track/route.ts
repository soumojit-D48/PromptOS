import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, properties } = body;

    if (!event) {
      return NextResponse.json({ error: "Missing event name" }, { status: 400 });
    }

    console.log(`[Track] ${event}`, properties);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Track] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}