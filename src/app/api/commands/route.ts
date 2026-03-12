import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, isNull, and } from "drizzle-orm";

// GET /api/commands?tv_id=tv-1 — Mac agent polls for unprocessed commands
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tvId = searchParams.get("tv_id");

  if (!tvId) return NextResponse.json({ error: "tv_id required" }, { status: 400 });

  const pending = await db
    .select()
    .from(schema.commands)
    .where(
      and(eq(schema.commands.tvId, tvId), isNull(schema.commands.processedAt))
    );

  // Mark them as processed
  if (pending.length > 0) {
    const ids = pending.map((c) => c.id);
    for (const id of ids) {
      await db
        .update(schema.commands)
        .set({ processedAt: new Date() })
        .where(eq(schema.commands.id, id));
    }
  }

  return NextResponse.json(pending);
}

// POST /api/commands — dashboard sends a command
export async function POST(request: Request) {
  const body = await request.json();
  const { tv_id, action, payload } = body;

  if (!tv_id || !action) {
    return NextResponse.json({ error: "tv_id and action required" }, { status: 400 });
  }

  const [cmd] = await db
    .insert(schema.commands)
    .values({
      tvId: tv_id,
      action,
      payload: payload ? JSON.stringify(payload) : null,
    })
    .returning();

  return NextResponse.json(cmd);
}
