import { NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { eq, isNull, and } from "drizzle-orm";

// GET /api/commands?tv_id=tv-1 — Mac agent polls for unprocessed commands
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tvId = searchParams.get("tv_id");

  if (!tvId) return NextResponse.json({ error: "tv_id required" }, { status: 400 });

  const pending = await getDb()
    .select()
    .from(schema.commands)
    .where(
      and(eq(schema.commands.tvId, tvId), isNull(schema.commands.processedAt))
    );

  return NextResponse.json(pending);
}

// PATCH /api/commands — agent acknowledges a command after execution
export async function PATCH(request: Request) {
  const body = await request.json();
  const { id } = body;

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await getDb()
    .update(schema.commands)
    .set({ processedAt: new Date() })
    .where(eq(schema.commands.id, id));

  return NextResponse.json({ ok: true });
}

// POST /api/commands — dashboard sends a command
export async function POST(request: Request) {
  const body = await request.json();
  const { tv_id, action, payload } = body;

  if (!tv_id || !action) {
    return NextResponse.json({ error: "tv_id and action required" }, { status: 400 });
  }

  const [cmd] = await getDb()
    .insert(schema.commands)
    .values({
      tvId: tv_id,
      action,
      payload: payload ? JSON.stringify(payload) : null,
    })
    .returning();

  return NextResponse.json(cmd);
}
