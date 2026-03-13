import { NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

// POST /api/agent/heartbeat — Mac agent reports its status
export async function POST(request: Request) {
  const body = await request.json();
  const { tv_id, status, current_video, current_filename, position_sec, duration_sec, playback_speed } = body;

  if (!tv_id) return NextResponse.json({ error: "tv_id required" }, { status: 400 });

  const db = getDb();

  // Resolve current video — accept UUID directly or look up by filename
  let videoId: string | null = current_video ?? null;
  if (!videoId && current_filename) {
    const [found] = await db
      .select({ id: schema.videos.id })
      .from(schema.videos)
      .where(eq(schema.videos.filename, current_filename));
    videoId = found?.id ?? null;
  }

  // Update video duration if mpv reports it and DB doesn't have it
  if (videoId && duration_sec && duration_sec > 0) {
    const [vid] = await db
      .select({ durationSec: schema.videos.durationSec })
      .from(schema.videos)
      .where(eq(schema.videos.id, videoId));
    if (vid && !vid.durationSec) {
      await db
        .update(schema.videos)
        .set({ durationSec: duration_sec })
        .where(eq(schema.videos.id, videoId));
    }
  }

  const [updated] = await db
    .update(schema.tvs)
    .set({
      status: status ?? "idle",
      currentVideo: videoId,
      positionSec: position_sec ?? 0,
      playbackSpeed: playback_speed ?? 1.0,
      lastHeartbeat: new Date(),
    })
    .where(eq(schema.tvs.id, tv_id))
    .returning();

  return NextResponse.json(updated);
}
