import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Read-only status of a Video. The Feed already exposes these values, and the
 * editor polls this while a freshly dropped video moves through the pipeline.
 */
export async function GET(_req: Request, { params }: Props) {
  const { id } = await params;
  const fileId = parseInt(id, 10);
  if (isNaN(fileId)) {
    return NextResponse.json({ error: "Invalid video ID" }, { status: 400 });
  }

  const { data, error } = await getSupabaseClient()
    .from("videos")
    .select("id, status, filepath")
    .eq("id", fileId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  return NextResponse.json({
    video: { id: data.id, status: data.status, url: data.filepath },
  });
}
