"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useState, useCallback } from "react";
import { Header } from "@/components/Header";
import { TVPanel } from "@/components/TVPanel";
import { VideoSidebar } from "@/components/VideoSidebar";
import { ActionBar } from "@/components/ActionBar";
import { ManageModal } from "@/components/ManageModal";

const TV_IDS = ["tv-1", "tv-2", "tv-3", "tv-4"] as const;

const TV_NAMES: Record<string, string> = {
  "tv-1": "555 Lounge",
  "tv-2": "555 Conference",
  "tv-3": "535 Conference",
  "tv-4": "535 Lounge",
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [selectedTvs, setSelectedTvs] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [showManage, setShowManage] = useState(false);

  const toggleVideo = useCallback((videoId: string) => {
    setSelectedVideos((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) next.delete(videoId);
      else next.add(videoId);
      return next;
    });
  }, []);

  const toggleTv = useCallback((tvId: string) => {
    setSelectedTvs((prev) => {
      const next = new Set(prev);
      if (next.has(tvId)) next.delete(tvId);
      else next.add(tvId);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedVideos(new Set());
    setSelectedTvs(new Set());
  }, []);

  const sendToTvs = useCallback(async () => {
    if (selectedVideos.size === 0 || selectedTvs.size === 0) return;
    setSending(true);
    const videoIds = Array.from(selectedVideos);
    const tvIds = Array.from(selectedTvs);

    // Queue videos on each TV, then auto-send play command
    await Promise.all(
      tvIds.map(async (tvId) => {
        await fetch("/api/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tv_id: tvId, video_ids: videoIds }),
        });
        await fetch("/api/commands", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tv_id: tvId, action: "play" }),
        });
      })
    );
    clearSelection();
    setSending(false);
  }, [selectedVideos, selectedTvs, clearSelection]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-800 border-t-blue-500" />
          <p className="text-[13px] text-zinc-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#09090b]">
      <Header user={session.user} />

      <div className="flex flex-1 overflow-hidden">
        {/* Video sidebar */}
        <VideoSidebar
          selectedVideos={selectedVideos}
          onToggleVideo={toggleVideo}
          onManage={() => setShowManage(true)}
        />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-[14px] font-medium text-zinc-300">Displays</h2>
                <p className="text-[12px] text-zinc-600">
                  {selectedTvs.size > 0
                    ? `${selectedTvs.size} selected`
                    : "Click to select targets"}
                </p>
              </div>
              {selectedTvs.size > 0 && (
                <button
                  onClick={() => setSelectedTvs(new Set())}
                  className="text-[12px] text-zinc-600 hover:text-zinc-400"
                >
                  Deselect all
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {TV_IDS.map((tvId) => (
                <TVPanel
                  key={tvId}
                  tvId={tvId}
                  displayName={TV_NAMES[tvId]}
                  isSelected={selectedTvs.has(tvId)}
                  onToggleSelect={() => toggleTv(tvId)}
                />
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* Manage modal */}
      {showManage && <ManageModal onClose={() => setShowManage(false)} />}

      {/* Action bar */}
      <ActionBar
        selectedVideoCount={selectedVideos.size}
        selectedTvCount={selectedTvs.size}
        sending={sending}
        onSend={sendToTvs}
        onClear={clearSelection}
      />
    </div>
  );
}
