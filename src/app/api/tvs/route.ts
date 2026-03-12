import { NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

// GET /api/tvs — fetch all TVs or a single TV by id
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tvId = searchParams.get("id");

    if (tvId) {
      const [tv] = await getDb()
        .select()
        .from(schema.tvs)
        .where(eq(schema.tvs.id, tvId));
      if (!tv) return NextResponse.json({ error: "TV not found" }, { status: 404 });
      return NextResponse.json(tv);
    }

    const allTvs = await getDb().select().from(schema.tvs);
    return NextResponse.json(allTvs);
  } catch (error) {
    console.error("GET /api/tvs error:", error);
    return NextResponse.json(
      { error: String(error), dbUrl: process.env.DATABASE_URL ? "set" : "missing" },
      { status: 500 }
    );
  }
}

// PATCH /api/tvs — update a TV's state
export async function PATCH(request: Request) {
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const [updated] = await getDb()
    .update(schema.tvs)
    .set(updates)
    .where(eq(schema.tvs.id, id))
    .returning();

  return NextResponse.json(updated);
}
