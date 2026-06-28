import { NextRequest, NextResponse } from "next/server";
import { getFilteredPosts, getFilterOptions } from "@/lib/posts";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year") || undefined;
  const month = searchParams.get("month") || undefined;
  const day = searchParams.get("day") || undefined;

  try {
    const session = await getSession();
    const isAdmin = session === "true";
    const posts = await getFilteredPosts({ year, month, day });
    const { years, months, days } = await getFilterOptions();
    return NextResponse.json({ posts, years, months, days, isAdmin });
  } catch (e) {
    return NextResponse.json({ error: "Filter failed", details: String(e) }, { status: 500 });
  }
}
