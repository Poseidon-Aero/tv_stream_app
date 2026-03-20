import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// One-time setup: creates all tables and seeds TVs
// Protected by secret key: /api/setup?secret=poseidon-setup-2026
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("secret") !== "poseidon-setup-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = neon(process.env.DATABASE_URL!);

  try {
    // Create tables
    await sql`
      CREATE TABLE IF NOT EXISTS videos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        filename TEXT NOT NULL UNIQUE,
        drive_file_id TEXT NOT NULL,
        duration_sec DOUBLE PRECISION,
        thumbnail_url TEXT,
        file_size BIGINT,
        blob_url TEXT,
        synced_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS tvs (
        id TEXT PRIMARY KEY,
        mac_id TEXT NOT NULL,
        status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'playing', 'paused')),
        current_video UUID REFERENCES videos(id),
        position_sec DOUBLE PRECISION DEFAULT 0,
        playback_speed DOUBLE PRECISION DEFAULT 1.0,
        loop_enabled BOOLEAN DEFAULT false,
        last_heartbeat TIMESTAMPTZ DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS queue_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tv_id TEXT NOT NULL REFERENCES tvs(id) ON DELETE CASCADE,
        video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        added_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE (tv_id, position)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS sync_groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT,
        leader_tv TEXT REFERENCES tvs(id),
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS sync_group_members (
        sync_group_id UUID NOT NULL REFERENCES sync_groups(id) ON DELETE CASCADE,
        tv_id TEXT NOT NULL REFERENCES tvs(id) ON DELETE CASCADE,
        PRIMARY KEY (sync_group_id, tv_id)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS commands (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tv_id TEXT NOT NULL REFERENCES tvs(id),
        action TEXT NOT NULL CHECK (action IN ('play','pause','stop','next','previous','seek','refresh')),
        payload TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        processed_at TIMESTAMPTZ
      )
    `;

    // Seed TVs
    await sql`
      INSERT INTO tvs (id, mac_id) VALUES
        ('tv-1', 'mac-mini-1'),
        ('tv-2', 'mac-mini-2'),
        ('tv-3', 'mac-mini-3')
      ON CONFLICT (id) DO NOTHING
    `;

    return NextResponse.json({
      ok: true,
      message: "All tables created and TVs seeded successfully!",
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
