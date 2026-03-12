"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useState } from "react";
import { Header } from "@/components/Header";
import { TVPanel } from "@/components/TVPanel";
import { VideoLibrary } from "@/components/VideoLibrary";

const TV_IDS = ["tv-1", "tv-2", "tv-3"] as const;

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [selectedTv, setSelectedTv] = useState<string>("tv-1");
  const [view, setView] = useState<"tvs" | "library">("tvs");

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-500 border-t-white" />
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <Header
        user={session.user}
        view={view}
        onViewChange={setView}
        selectedTv={selectedTv}
        onSelectTv={setSelectedTv}
      />

      <main className="mx-auto max-w-7xl px-4 py-6">
        {view === "tvs" ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {TV_IDS.map((tvId) => (
              <TVPanel key={tvId} tvId={tvId} isSelected={tvId === selectedTv} />
            ))}
          </div>
        ) : (
          <VideoLibrary selectedTv={selectedTv} />
        )}
      </main>
    </div>
  );
}
