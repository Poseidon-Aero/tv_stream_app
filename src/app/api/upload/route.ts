import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getDb, schema } from "@/lib/db";

// POST /api/upload — upload a video file to Vercel Blob and register it
export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const filename = file.name;

  // Upload to Vercel Blob
  const blob = await put(`videos/${filename}`, file, {
    access: "public",
    addRandomSuffix: false,
  });

  // Register in DB
  const [video] = await getDb()
    .insert(schema.videos)
    .values({
      filename,
      driveFileId: `upload-${Date.now()}`,
      fileSize: file.size,
      blobUrl: blob.url,
    })
    .onConflictDoUpdate({
      target: schema.videos.filename,
      set: {
        fileSize: file.size,
        blobUrl: blob.url,
        syncedAt: new Date(),
      },
    })
    .returning();

  return NextResponse.json(video);
}
