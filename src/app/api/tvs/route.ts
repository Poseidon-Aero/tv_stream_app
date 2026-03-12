import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

// GET /api/tvs — fetch all TVs or a single TV by id
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tvId = searchParams.get("id");

  if (tvId) {
    const [tv] = await db
      .select()
      .from(schema.tvs)
      .where(eq(schema.tvs.id, tvId));
    if (!tv) return NextResponse.json({ error: "TV not found" }, { status: 404 });
    return NextResponse.json(tv);
  }

  const allTvs = await db.select().from(schema.tvs);
  return NextResponse.json(allTvs);
}

// PATCH /api/tvs — update a TV's state
export async function PATCH(request: Request) {
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const [updated] = await db
    .update(schema.tvs)
    .set(updates)
    .where(eq(schema.tvs.id, id))
    .returning();

  return NextResponse.json(updated);
}
