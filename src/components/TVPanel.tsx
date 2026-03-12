"use client";

import { usePolling } from "@/hooks/usePolling";
import type { TV, Video, QueueItemWithVideo } from "@/lib/db/types";
import { TransportControls } from "./TransportControls";

type TVPanelProps = {
  tvId: string;
  isSelected: boolean;
};

type QueueAPIItem = {
  id: string;
  tvId: string;
  videoId: string;
  position: number;
  addedAt: string;
  video: Video;
};

export function TVPanel({ tvId, isSelected }: TVPanelProps) {
  const { data: tv } = usePolling<TV>(`/api/tvs?id=${tvId}`, 1000);
  const { data: queueData, refetch: refetchQueue } = usePolling<QueueAPIItem[]>(
    `/api/queue?tv_id=${tvId}`,
    3000
  );
  const { data: currentVideo } = usePolling<Video | null>(
    tv?.currentVideo ? `/api/videos?id=${tv.currentVideo}` : "",
    2000
  );

  const queue = queueData ?? [];

  async function removeFromQueue(queueItemId: string) {
    await fetch(`/api/queue?id=${queueItemId}`, { method: "DELETE" });
    refetchQueue();
  }

  async function toggleLoop() {
    if (!tv) return;
    await fetch("/api/tvs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: tvId, loopEnabled: !tv.loopEnabled }),
    });
  }

  const isOnline = tv
    ? Date.now() - new Date(tv.lastHeartbeat ?? 0).getTime() < 10000
    : false;

  const statusColor = !tv
    ? "bg-zinc-600"
    : !isOnline
    ? "bg-red-500"
    : tv.status === "playing"
    ? "bg-green-500"
    : tv.status === "paused"
    ? "bg-yellow-500"
    : "bg-zinc-500";

  const label = tvId.replace("tv-", "TV ");

  function formatTime(sec: number) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const progress =
    tv && currentVideo?.durationSec
      ? ((tv.positionSec ?? 0) / currentVideo.durationSec) * 100
      : 0;

  return (
    <div
      className={`rounded-xl border bg-zinc-900 p-5 transition-colors ${
        isSelected ? "border-blue-500" : "border-zinc-800"
      }`}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
          <h2 className="text-lg font-semibold">{label}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleLoop}
            className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              tv?.loopEnabled
                ? "bg-blue-500/20 text-blue-400"
                : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
            }`}
            title="Toggle loop"
          >
            Loop {tv?.loopEnabled ? "ON" : "OFF"}
          </button>
          <span className="text-xs text-zinc-500">
            {!isOnline ? "Offline" : tv?.status ?? "..."}
          </span>
        </div>
      </div>

      {/* Now Playing */}
      {currentVideo ? (
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-3">
            {currentVideo.thumbnailUrl && (
              <img
                src={currentVideo.thumbnailUrl}
                alt=""
                className="h-12 w-20 rounded object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{currentVideo.filename}</p>
              <p className="text-xs text-zinc-500">
                {formatTime(tv?.positionSec ?? 0)} / {formatTime(currentVideo.durationSec ?? 0)}
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 w-full rounded-full bg-zinc-800">
            <div
              className="h-1.5 rounded-full bg-blue-500 transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="mb-4 flex h-20 items-center justify-center rounded-lg border border-dashed border-zinc-800">
          <p className="text-sm text-zinc-600">No video playing</p>
        </div>
      )}

      {/* Transport Controls */}
      <TransportControls tvId={tvId} disabled={!isOnline} />

      {/* Queue */}
      <div className="mt-4">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Queue ({queue.length})
        </h3>
        {queue.length === 0 ? (
          <p className="text-xs text-zinc-600">No videos in queue</p>
        ) : (
          <ul className="space-y-1">
            {queue.map((item, idx) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-md bg-zinc-800/50 px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-zinc-600">{idx + 1}</span>
                  <span className="truncate text-sm">{item.video?.filename ?? "Unknown"}</span>
                </div>
                <button
                  onClick={() => removeFromQueue(item.id)}
                  className="ml-2 text-xs text-zinc-600 hover:text-red-400"
                >
                  x
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
