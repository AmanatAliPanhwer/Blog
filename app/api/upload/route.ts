import { NextRequest, NextResponse } from "next/server";
import { uploadImage, saveVideo } from "@/lib/posts";
import { getSession } from "@/lib/auth";
import { checkUpload, isUploadKind } from "@/lib/uploads";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session !== "true") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const type = formData.get("type");

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!isUploadKind(type)) {
    return NextResponse.json(
      { error: 'Upload type must be "image" or "video"' },
      { status: 400 }
    );
  }

  const rejection = checkUpload(file, type);
  if (rejection) {
    const status = rejection.code === "too_large" ? 413 : 415;
    return NextResponse.json(
      { error: rejection.message, code: rejection.code },
      { status }
    );
  }

  try {
    if (type === "video") {
      const { file_id, filepath } = await saveVideo(file);
      return NextResponse.json({ videoId: file_id, videoUrl: filepath });
    }

    const imageUrl = await uploadImage(file);
    return NextResponse.json({ imageUrl });
  } catch (e) {
    console.error("Upload failed:", e);
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
