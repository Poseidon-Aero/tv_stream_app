import {
  pgTable,
  uuid,
  text,
  doublePrecision,
  bigint,
  timestamp,
  integer,
  boolean,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";

export const videos = pgTable("videos", {
  id: uuid("id").defaultRandom().primaryKey(),
  filename: text("filename").notNull().unique(),
  driveFileId: text("drive_file_id").notNull(),
  durationSec: doublePrecision("duration_sec"),
  thumbnailUrl: text("thumbnail_url"),
  fileSize: bigint("file_size", { mode: "number" }),
  blobUrl: text("blob_url"),
  syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow(),
});

export const tvs = pgTable("tvs", {
  id: text("id").primaryKey(), // 'tv-1', 'tv-2', 'tv-3'
  macId: text("mac_id").notNull(),
  status: text("status", { enum: ["idle", "playing", "paused"] }).default("idle"),
  currentVideo: uuid("current_video").references(() => videos.id),
  positionSec: doublePrecision("position_sec").default(0),
  playbackSpeed: doublePrecision("playback_speed").default(1.0),
  loopEnabled: boolean("loop_enabled").default(false),
  lastHeartbeat: timestamp("last_heartbeat", { withTimezone: true }).defaultNow(),
});

export const queueItems = pgTable(
  "queue_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tvId: text("tv_id")
      .references(() => tvs.id, { onDelete: "cascade" })
      .notNull(),
    videoId: uuid("video_id")
      .references(() => videos.id, { onDelete: "cascade" })
      .notNull(),
    position: integer("position").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [uniqueIndex("queue_tv_position").on(table.tvId, table.position)]
);

export const syncGroups = pgTable("sync_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  leaderTv: text("leader_tv").references(() => tvs.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const syncGroupMembers = pgTable(
  "sync_group_members",
  {
    syncGroupId: uuid("sync_group_id")
      .references(() => syncGroups.id, { onDelete: "cascade" })
      .notNull(),
    tvId: text("tv_id")
      .references(() => tvs.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.syncGroupId, table.tvId] })]
);

// Command queue — transient commands from dashboard to agents
export const commands = pgTable("commands", {
  id: uuid("id").defaultRandom().primaryKey(),
  tvId: text("tv_id")
    .references(() => tvs.id)
    .notNull(),
  action: text("action", {
    enum: ["play", "pause", "stop", "next", "previous", "seek", "sync", "refresh"],
  }).notNull(),
  payload: text("payload"), // JSON string for optional data like seek position
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});
