import type { InferSelectModel } from "drizzle-orm";
import type { videos, tvs, queueItems, syncGroups, syncGroupMembers, commands } from "./schema";

export type Video = InferSelectModel<typeof videos>;
export type TV = InferSelectModel<typeof tvs>;
export type QueueItem = InferSelectModel<typeof queueItems>;
export type SyncGroup = InferSelectModel<typeof syncGroups>;
export type SyncGroupMember = InferSelectModel<typeof syncGroupMembers>;
export type Command = InferSelectModel<typeof commands>;

export type QueueItemWithVideo = QueueItem & { video: Video };

export type TVCommand = {
  tv_id: string;
  action: "play" | "pause" | "stop" | "next" | "previous" | "seek";
  payload?: { position?: number };
};
