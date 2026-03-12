"use client";

import { useState } from "react";
import { usePolling } from "@/hooks/usePolling";
import type { Video } from "@/lib/db/types";

type VideoLibraryProps = {
  selectedTv: string;
};

export function VideoLibrary({ selectedTv }: VideoLibraryProps) {
  const { data: videos } = usePolling<Video[]>("/api/videos", 5000);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  function toggleSelect(videoId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  }

  async function addToQueue() {
    if (selected.size === 0) return;
    setAdding(true);

    await fetch("/api/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tv_id: selectedTv,
        video_ids: Array.from(selected),
      }),
    });

    setSelected(new Set());
    setAdding(false);
  }

  function formatSize(bytes: number | null) {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  function formatDuration(sec: number | null) {
    if (!sec) return "";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const tvLabel = selectedTv.replace("tv-", "TV ");
  const videoList = videos ?? [];

  return (
    <div>
      {/* Action bar */}
      {selected.size > 0 && (
        <div className="sticky top-0 z-10 mb-4 flex items-center justify-between rounded-lg bg-blue-600/20 border border-blue-500/30 px-4 py-3 backdrop-blur-sm">
          <span className="text-sm font-medium text-blue-300">
            {selected.size} video{selected.size > 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelected(new Set())}
              className="rounded-md px-3 py-1.5 text-sm text-zinc-400 hover:text-white"
            >
              Clear
            </button>
            <button
              onClick={addToQueue}
              disabled={adding}
              className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              Add to {tvLabel}
            </button>
          </div>
        </div>
      )}

      {/* Video grid */}
      {videoList.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-zinc-800">
          <div className="text-center">
            <p className="text-zinc-500">No videos synced yet</p>
            <p className="mt-1 text-xs text-zinc-600">
              Videos will appear here once Mac agents sync from Google Drive
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {videoList.map((video) => (
            <button
              key={video.id}
              onClick={() => toggleSelect(video.id)}
              className={`group relative overflow-hidden rounded-lg border text-left transition-all ${
                selected.has(video.id)
                  ? "border-blue-500 ring-2 ring-blue-500/30"
                  : "border-zinc-800 hover:border-zinc-700"
              }`}
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-zinc-800">
                {video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <svg className="h-8 w-8 text-zinc-700" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-2">
                <p className="truncate text-xs font-medium">{video.filename}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                  {video.durationSec && <span>{formatDuration(video.durationSec)}</span>}
                  {video.fileSize && <span>{formatSize(video.fileSize)}</span>}
                </div>
              </div>

              {/* Selection indicator */}
              {selected.has(video.id) && (
                <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
