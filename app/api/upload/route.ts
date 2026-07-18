import { NextRequest, NextResponse } from "next/server";
import { uploadImage, saveVideo } from "@/lib/posts";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session !== "true") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const type = formData.get("type") as string;

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  try {
    if (type === "video") {
      const result = await saveVideo(file);
      if (!result) {
        return NextResponse.json({ error: "Failed to upload video" }, { status: 500 });
      }
      return NextResponse.json({ videoId: result.file_id });
    }

    const url = await uploadImage(file);
    return NextResponse.json({ imageUrl: url });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
