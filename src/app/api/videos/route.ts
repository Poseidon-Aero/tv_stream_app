import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { asc } from "drizzle-orm";

// GET /api/videos — list all videos, or get one by id
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const [video] = await db
      .select()
      .from(schema.videos)
      .where(eq(schema.videos.id, id));
    if (!video) return NextResponse.json(null);
    return NextResponse.json(video);
  }

  const allVideos = await db
    .select()
    .from(schema.videos)
    .orderBy(asc(schema.videos.filename));
  return NextResponse.json(allVideos);
}

// POST /api/videos — upsert a video (used by Mac agents after sync)
export async function POST(request: Request) {
  const body = await request.json();

  const [video] = await db
    .insert(schema.videos)
    .values({
      filename: body.filename,
      driveFileId: body.drive_file_id,
      durationSec: body.duration_sec,
      thumbnailUrl: body.thumbnail_url,
      fileSize: body.file_size,
    })
    .onConflictDoUpdate({
      target: schema.videos.filename,
      set: {
        durationSec: body.duration_sec,
        thumbnailUrl: body.thumbnail_url,
        fileSize: body.file_size,
        syncedAt: new Date(),
      },
    })
    .returning();

  return NextResponse.json(video);
}

// DELETE /api/videos?id=xxx
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.delete(schema.videos).where(eq(schema.videos.id, id));
  return NextResponse.json({ ok: true });
}
