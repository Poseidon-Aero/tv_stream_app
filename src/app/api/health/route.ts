import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { getDb, schema } = await import("@/lib/db");
    const db = getDb();
    const tvs = await db.select().from(schema.tvs);
    return NextResponse.json({ ok: true, tvCount: tvs.length, tvs });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined,
      dbUrl: process.env.DATABASE_URL ? "set (" + process.env.DATABASE_URL.substring(0, 30) + "...)" : "MISSING",
    }, { status: 500 });
  }
}
