-- TV Command Center — Supabase Schema
-- Run this in your Supabase SQL Editor to set up all tables

-- Video catalog (populated by Mac agents after rclone sync)
CREATE TABLE videos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename      TEXT NOT NULL UNIQUE,
  drive_file_id TEXT NOT NULL,
  duration_sec  FLOAT,
  thumbnail_url TEXT,
  file_size     BIGINT,
  synced_at     TIMESTAMPTZ DEFAULT now()
);

-- Each TV's state
CREATE TABLE tvs (
  id              TEXT PRIMARY KEY,  -- 'tv-1', 'tv-2', 'tv-3'
  mac_id          TEXT NOT NULL,     -- hostname or assigned ID
  status          TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'playing', 'paused')),
  current_video   UUID REFERENCES videos(id),
  position_sec    FLOAT DEFAULT 0,
  playback_speed  FLOAT DEFAULT 1.0,
  loop_enabled    BOOLEAN DEFAULT false,
  last_heartbeat  TIMESTAMPTZ DEFAULT now()
);

-- Per-TV queue (ordered playlist)
CREATE TABLE queue_items (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tv_id     TEXT REFERENCES tvs(id) ON DELETE CASCADE,
  video_id  UUID REFERENCES videos(id) ON DELETE CASCADE,
  position  INT NOT NULL,
  added_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tv_id, position)
);

-- Sync groups (which TVs are synced together)
CREATE TABLE sync_groups (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT,
  leader_tv  TEXT REFERENCES tvs(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sync_group_members (
  sync_group_id UUID REFERENCES sync_groups(id) ON DELETE CASCADE,
  tv_id         TEXT REFERENCES tvs(id) ON DELETE CASCADE,
  PRIMARY KEY (sync_group_id, tv_id)
);

-- Seed the 3 TVs
INSERT INTO tvs (id, mac_id) VALUES
  ('tv-1', 'mac-mini-1'),
  ('tv-2', 'mac-mini-2'),
  ('tv-3', 'mac-mini-3');

-- Enable Realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE tvs;
ALTER PUBLICATION supabase_realtime ADD TABLE queue_items;
ALTER PUBLICATION supabase_realtime ADD TABLE videos;

-- Row Level Security
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tvs ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_group_members ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can read/write everything
-- (agents use service role key which bypasses RLS)
CREATE POLICY "Authenticated users can read videos" ON videos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read tvs" ON tvs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update tvs" ON tvs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can read queue" ON queue_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert queue" ON queue_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update queue" ON queue_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete queue" ON queue_items FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can read sync_groups" ON sync_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage sync_groups" ON sync_groups FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can read sync_members" ON sync_group_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage sync_members" ON sync_group_members FOR ALL TO authenticated USING (true);
