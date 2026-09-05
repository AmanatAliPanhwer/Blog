import { NextRequest, NextResponse } from "next/server";
import { getFeed } from "@/lib/posts";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const q = searchParams.get("q") || undefined;
  const year = searchParams.get("year") || null;
  const month = searchParams.get("month") || null;
  const day = searchParams.get("day") || null;

  try {
    const result = await getFeed({ page, q, year, month, day });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch feed", details: String(e) }, { status: 500 });
  }
}