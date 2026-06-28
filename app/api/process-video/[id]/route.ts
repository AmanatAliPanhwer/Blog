import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, BLOG_VIDEOS_BUCKET } from "@/lib/supabase";
import fs from "fs";
import path from "path";
import os from "os";

interface Props {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Props) {
  const { id } = await params;
  const fileId = parseInt(id, 10);
  if (isNaN(fileId)) {
    return NextResponse.json({ error: "Invalid file ID" }, { status: 400 });
  }

  try {
    const { data: videoRecord } = await getSupabaseClient()
      .from("videos")
      .select("filepath, filename")
      .eq("id", fileId)
      .single();

    if (!videoRecord) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const filename = videoRecord.filename;
    const uploadFolder = path.join(os.tmpdir(), "uploads");
    fs.mkdirSync(uploadFolder, { recursive: true });
    const videoFilePath = path.join(uploadFolder, filename);

    // Download from Supabase storage
    const { data: fileData } = await getSupabaseClient().storage
      .from(BLOG_VIDEOS_BUCKET)
      .download(`upload/${filename}`);

    if (!fileData) {
      return NextResponse.json({ error: "Failed to download video" }, { status: 500 });
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    fs.writeFileSync(videoFilePath, buffer);

    // Update status to processing
    await getSupabaseClient()
      .from("videos")
      .update({ status: "processing" })
      .eq("id", fileId);

    // Call external ffmpeg service
    const ffmpegUrl = process.env.FFMPEG_SERVICE_URL || "https://ffmpeg.pythonanywhere.com";
    const formData = new FormData();
    const blob = new Blob([buffer], { type: "video/mp4" });
    formData.append("file", blob, filename);

    const ffmpegRes = await fetch(`${ffmpegUrl}/upload/${fileId}`, {
      method: "POST",
      body: formData,
    });

    if (ffmpegRes.ok) {
      const result = await ffmpegRes.json();
      const masterPlaylist = result.master_playlist || videoRecord.filepath;

      await getSupabaseClient()
        .from("videos")
        .update({ status: "processed", filepath: masterPlaylist })
        .eq("id", fileId);

      // Clean up raw upload
      await getSupabaseClient().storage
        .from(BLOG_VIDEOS_BUCKET)
        .remove([`upload/${filename}`]);

      return NextResponse.json({ ok: true, master_playlist: masterPlaylist });
    } else {
      const errText = await ffmpegRes.text();
      throw new Error(`FFmpeg service error: ${errText}`);
    }
  } catch (e) {
    console.error("Error processing video:", e);
    await getSupabaseClient()
      .from("videos")
      .update({ status: "failed" })
      .eq("id", fileId);

    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
