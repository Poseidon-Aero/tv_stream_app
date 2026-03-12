import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

// POST /api/agent/heartbeat — Mac agent reports its status
export async function POST(request: Request) {
  const body = await request.json();
  const { tv_id, status, current_video, position_sec, playback_speed } = body;

  if (!tv_id) return NextResponse.json({ error: "tv_id required" }, { status: 400 });

  const [updated] = await db
    .update(schema.tvs)
    .set({
      status: status ?? "idle",
      currentVideo: current_video ?? null,
      positionSec: position_sec ?? 0,
      playbackSpeed: playback_speed ?? 1.0,
      lastHeartbeat: new Date(),
    })
    .where(eq(schema.tvs.id, tv_id))
    .returning();

  return NextResponse.json(updated);
}
