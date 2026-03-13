"use client";

import { usePolling } from "@/hooks/usePolling";
import type { TV, Video } from "@/lib/db/types";
import { TransportControls } from "./TransportControls";

type TVPanelProps = {
  tvId: string;
  isSelected: boolean;
  onToggleSelect: () => void;
};

type QueueAPIItem = {
  id: string;
  tvId: string;
  videoId: string;
  position: number;
  addedAt: string;
  video: Video;
};

export function TVPanel({ tvId, isSelected, onToggleSelect }: TVPanelProps) {
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

  const statusDot = !tv
    ? "bg-zinc-700"
    : !isOnline
    ? "bg-zinc-600"
    : tv.status === "playing"
    ? "bg-emerald-400 glow-green"
    : tv.status === "paused"
    ? "bg-amber-400"
    : "bg-zinc-500";

  const statusLabel = !tv
    ? "Loading"
    : !isOnline
    ? "Offline"
    : tv.status === "playing"
    ? "Playing"
    : tv.status === "paused"
    ? "Paused"
    : "Idle";

  const num = tvId.replace("tv-", "");

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border backdrop-blur-sm ${
        isSelected
          ? "border-blue-500/40 bg-blue-500/[0.04] glow-blue"
          : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.03]"
      }`}
    >
      {/* Select header */}
      <button
        onClick={onToggleSelect}
        className="flex w-full items-center justify-between px-5 pt-4 pb-3 text-left"
      >
        <div className="flex items-center gap-3">
          {/* Checkbox */}
          <div className={`flex h-[18px] w-[18px] items-center justify-center rounded-md border ${
            isSelected
              ? "border-blue-500 bg-blue-500"
              : "border-zinc-700 bg-white/[0.03]"
          }`}>
            {isSelected && (
              <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] text-[13px] font-bold text-zinc-400">
              {num}
            </span>
            <div>
              <h2 className="text-[14px] font-semibold text-white">TV {num}</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
                <span className="text-[11px] text-zinc-500">{statusLabel}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {tv?.loopEnabled && (
            <span className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-400 ring-1 ring-blue-500/20">
              LOOP
            </span>
          )}
        </div>
      </button>

      <div className="px-5 pb-4">
        {/* Now Playing */}
        {currentVideo ? (
          <div className="mb-3 rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/[0.04]">
            <div className="flex items-center gap-3">
              {currentVideo.thumbnailUrl ? (
                <img
                  src={currentVideo.thumbnailUrl}
                  alt=""
                  className="h-11 w-[72px] rounded-lg object-cover ring-1 ring-white/[0.06]"
                />
              ) : (
                <div className="flex h-11 w-[72px] items-center justify-center rounded-lg bg-white/[0.04]">
                  <svg className="h-5 w-5 text-zinc-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-zinc-200">
                  {currentVideo.filename.replace(/\.[^/.]+$/, "")}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-3 flex h-[72px] items-center justify-center rounded-xl border border-dashed border-white/[0.06]">
            <p className="text-[12px] text-zinc-700">No video playing</p>
          </div>
        )}

        {/* Transport */}
        <TransportControls
          tvId={tvId}
          disabled={!isOnline}
          positionSec={tv?.positionSec ?? 0}
          durationSec={currentVideo?.durationSec ?? 0}
        />

        {/* Queue */}
        <div className="mt-3 border-t border-white/[0.04] pt-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-600">
              Queue {queue.length > 0 && `(${queue.length})`}
            </span>
            <button
              onClick={toggleLoop}
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                tv?.loopEnabled
                  ? "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20"
                  : "text-zinc-700 hover:text-zinc-500"
              }`}
            >
              {tv?.loopEnabled ? "Loop ON" : "Loop OFF"}
            </button>
          </div>

          {queue.length === 0 ? (
            <p className="text-[11px] text-zinc-700">Select videos to queue</p>
          ) : (
            <ul className="space-y-0.5 max-h-32 overflow-y-auto">
              {queue.map((item, idx) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-white/[0.03]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] tabular-nums text-zinc-700">{idx + 1}</span>
                    <span className="truncate text-[11px] text-zinc-400">{item.video?.filename?.replace(/\.[^/.]+$/, "") ?? "Unknown"}</span>
                  </div>
                  <button
                    onClick={() => removeFromQueue(item.id)}
                    className="ml-2 rounded p-0.5 text-zinc-700 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
