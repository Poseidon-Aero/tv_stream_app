"use client";

import { useState } from "react";
import { usePolling } from "@/hooks/usePolling";
import type { Video } from "@/lib/db/types";

type VideoSidebarProps = {
  selectedVideos: Set<string>;
  onToggleVideo: (videoId: string) => void;
  onManage: () => void;
};

export function VideoSidebar({ selectedVideos, onToggleVideo, onManage }: VideoSidebarProps) {
  const { data: videos } = usePolling<Video[]>("/api/videos", 5000);
  const [search, setSearch] = useState("");

  const videoList = (videos ?? []).filter((v) =>
    search === "" || v.filename.toLowerCase().includes(search.toLowerCase())
  );

  function formatDuration(sec: number | null) {
    if (!sec) return "";
    if (sec >= 3600) {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      return `${h}:${m.toString().padStart(2, "0")}:00`;
    }
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function formatSize(bytes: number | null) {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  return (
    <aside className="flex w-72 flex-col border-r border-white/[0.06] bg-black/20">
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-2.625 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5" />
            </svg>
            <h2 className="text-[13px] font-medium text-zinc-400">Videos</h2>
          </div>
          {selectedVideos.size > 0 && (
            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-400 ring-1 ring-blue-500/20">
              {selectedVideos.size}
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] py-1.5 pl-8 pr-3 text-[13px] text-zinc-300 placeholder-zinc-600 outline-none focus:border-blue-500/30 focus:bg-white/[0.05]"
          />
        </div>
      </div>

      {/* Video list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {videoList.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center px-4">
            <div className="mb-2 rounded-xl bg-white/[0.03] p-3">
              <svg className="h-6 w-6 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <p className="text-[12px] text-zinc-600">No videos yet</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {videoList.map((video) => {
              const isSelected = selectedVideos.has(video.id);
              return (
                <button
                  key={video.id}
                  onClick={() => onToggleVideo(video.id)}
                  className={`group flex w-full items-start gap-2.5 rounded-xl p-2 text-left ${
                    isSelected
                      ? "bg-blue-500/10 ring-1 ring-blue-500/20"
                      : "hover:bg-white/[0.04]"
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="relative h-[52px] w-[84px] flex-shrink-0 overflow-hidden rounded-lg bg-zinc-900 ring-1 ring-white/[0.06]">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-zinc-900">
                        <svg className="h-5 w-5 text-zinc-700" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    )}
                    {/* Duration */}
                    {video.durationSec && (
                      <span className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 py-px text-[9px] font-medium text-zinc-300 backdrop-blur-sm">
                        {formatDuration(video.durationSec)}
                      </span>
                    )}
                    {/* Check */}
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center bg-blue-500/30 backdrop-blur-[1px]">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 shadow-lg">
                          <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className={`truncate text-[12px] font-medium leading-tight ${isSelected ? "text-blue-300" : "text-zinc-300 group-hover:text-white"}`}>
                      {video.filename.replace(/\.[^/.]+$/, "")}
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-600">
                      {formatSize(video.fileSize)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-white/[0.04] px-4 py-2">
        <p className="text-[11px] text-zinc-700">
          {videoList.length} video{videoList.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={onManage}
          className="rounded-lg px-2.5 py-1 text-[11px] font-medium text-zinc-500 hover:bg-white/[0.05] hover:text-white"
        >
          Manage
        </button>
      </div>
    </aside>
  );
}
