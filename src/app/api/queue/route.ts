import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, asc, desc } from "drizzle-orm";

// GET /api/queue?tv_id=tv-1 — get queue for a TV with video details
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tvId = searchParams.get("tv_id");

  if (!tvId) return NextResponse.json({ error: "tv_id required" }, { status: 400 });

  const items = await db
    .select({
      id: schema.queueItems.id,
      tvId: schema.queueItems.tvId,
      videoId: schema.queueItems.videoId,
      position: schema.queueItems.position,
      addedAt: schema.queueItems.addedAt,
      video: schema.videos,
    })
    .from(schema.queueItems)
    .innerJoin(schema.videos, eq(schema.queueItems.videoId, schema.videos.id))
    .where(eq(schema.queueItems.tvId, tvId))
    .orderBy(asc(schema.queueItems.position));

  return NextResponse.json(items);
}

// POST /api/queue — add videos to a TV's queue
export async function POST(request: Request) {
  const body = await request.json();
  const { tv_id, video_ids } = body as { tv_id: string; video_ids: string[] };

  if (!tv_id || !video_ids?.length) {
    return NextResponse.json({ error: "tv_id and video_ids required" }, { status: 400 });
  }

  // Get current max position
  const [last] = await db
    .select({ position: schema.queueItems.position })
    .from(schema.queueItems)
    .where(eq(schema.queueItems.tvId, tv_id))
    .orderBy(desc(schema.queueItems.position))
    .limit(1);

  let nextPos = (last?.position ?? -1) + 1;

  const inserts = video_ids.map((videoId) => ({
    tvId: tv_id,
    videoId,
    position: nextPos++,
  }));

  await db.insert(schema.queueItems).values(inserts);
  return NextResponse.json({ ok: true, added: inserts.length });
}

// DELETE /api/queue?id=xxx — remove a queue item
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.delete(schema.queueItems).where(eq(schema.queueItems.id, id));
  return NextResponse.json({ ok: true });
}
