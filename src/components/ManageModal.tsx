"use client";

import { useCallback, useRef, useState } from "react";
import { usePolling } from "@/hooks/usePolling";
import type { Video } from "@/lib/db/types";

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDuration(sec: number | null) {
  if (!sec) return "—";
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ManageModal({ onClose }: { onClose: () => void }) {
  const { data: videos, refetch } = usePolling<Video[]>("/api/videos", 5000);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const videoList = (videos ?? []).filter(
    (v) => !search || v.filename.toLowerCase().includes(search.toLowerCase())
  );

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(`Uploading to Drive ${i + 1}/${files.length}: ${file.name}`);
      const form = new FormData();
      form.append("file", file);

      try {
        await fetch("/api/upload", { method: "POST", body: form });
      } catch (err) {
        console.error("Upload failed:", err);
      }
    }

    setUploading(false);
    setUploadProgress("");
    refetch();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [refetch]);

  const handleDelete = useCallback(async (id: string) => {
    setDeleting((prev) => new Set(prev).add(id));
    try {
      await fetch(`/api/videos?id=${id}`, { method: "DELETE" });
      refetch();
    } catch (err) {
      console.error("Delete failed:", err);
    }
    setDeleting((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, [refetch]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleUpload(e.dataTransfer.files);
  }, [handleUpload]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0c0e] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div>
            <h2 className="text-[16px] font-semibold text-white">Manage Videos</h2>
            <p className="text-[12px] text-zinc-500">
              {(videos ?? []).length} videos — uploads go directly to Google Drive
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/[0.05] hover:text-white">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Upload area */}
        <div
          className="mx-6 mt-4 rounded-xl border-2 border-dashed border-white/[0.08] p-6 text-center hover:border-blue-500/30 hover:bg-blue-500/[0.02]"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500" />
              <p className="text-[13px] text-zinc-400">{uploadProgress}</p>
            </div>
          ) : (
            <>
              <svg className="mx-auto mb-2 h-8 w-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p className="text-[13px] text-zinc-400">Drag & drop videos to upload to Google Drive</p>
              <p className="mt-1 text-[11px] text-zinc-600">or</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 rounded-lg bg-blue-500 px-4 py-1.5 text-[13px] font-medium text-white hover:bg-blue-400 active:scale-95"
              >
                Browse files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="video/*"
                className="hidden"
                onChange={(e) => handleUpload(e.target.files)}
              />
            </>
          )}
        </div>

        {/* Search */}
        <div className="px-6 pt-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search videos..."
              className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] py-2 pl-9 pr-3 text-[13px] text-zinc-300 placeholder-zinc-600 outline-none focus:border-blue-500/30"
            />
          </div>
        </div>

        {/* Video list */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {videoList.length === 0 ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-[13px] text-zinc-600">No videos found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04] text-left text-[11px] font-medium text-zinc-600">
                  <th className="pb-2 pr-4">Filename</th>
                  <th className="pb-2 pr-4 w-20">Duration</th>
                  <th className="pb-2 pr-4 w-20">Size</th>
                  <th className="pb-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {videoList.map((video) => (
                  <tr key={video.id} className="group border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-3">
                        {video.thumbnailUrl ? (
                          <img src={video.thumbnailUrl} alt="" className="h-8 w-14 rounded object-cover ring-1 ring-white/[0.06]" />
                        ) : (
                          <div className="flex h-8 w-14 items-center justify-center rounded bg-zinc-900 ring-1 ring-white/[0.06]">
                            <svg className="h-3.5 w-3.5 text-zinc-700" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                          </div>
                        )}
                        <span className="truncate text-[12px] text-zinc-300">{video.filename}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-[12px] tabular-nums text-zinc-500">{formatDuration(video.durationSec)}</td>
                    <td className="py-2.5 pr-4 text-[12px] text-zinc-500">{formatSize(video.fileSize)}</td>
                    <td className="py-2.5">
                      <button
                        onClick={() => handleDelete(video.id)}
                        disabled={deleting.has(video.id)}
                        className="rounded p-1 text-zinc-700 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
