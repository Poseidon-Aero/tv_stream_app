"use client";

import { signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";

const TV_IDS = ["tv-1", "tv-2", "tv-3"];
const TV_NAMES: Record<string, string> = {
  "tv-1": "555 Lounge",
  "tv-2": "535 Lounge",
  "tv-3": "535 Conference",
};

type HeaderProps = {
  user: { name?: string | null; image?: string | null } | undefined;
};

export function Header({ user }: HeaderProps) {
  const [showRefresh, setShowRefresh] = useState(false);
  const [refreshing, setRefreshing] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowRefresh(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleRefresh(tvId: string) {
    setRefreshing((prev) => new Set(prev).add(tvId));
    try {
      await fetch("/api/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tv_id: tvId, action: "refresh" }),
      });
    } catch (err) {
      console.error("Refresh failed:", err);
    }
    // Keep spinner for 3s since agent needs time to restart
    setTimeout(() => {
      setRefreshing((prev) => {
        const next = new Set(prev);
        next.delete(tvId);
        return next;
      });
    }, 3000);
  }

  async function handleRefreshAll() {
    for (const tvId of TV_IDS) {
      handleRefresh(tvId);
    }
  }

  return (
    <header className="relative z-10 border-b border-white/[0.06] bg-black/40 backdrop-blur-xl">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20">
            <svg className="h-[18px] w-[18px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 9.5l5 2.5-5 2.5v-5z" />
            </svg>
          </div>
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight text-white">TV Command Center</h1>
            <p className="text-[11px] text-zinc-500">Multi-display control</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowRefresh(!showRefresh)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-zinc-400 hover:bg-white/[0.05] hover:text-white"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              Refresh Agent
            </button>

            {showRefresh && (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-white/[0.08] bg-[#0c0c0e] p-1.5 shadow-2xl">
                {TV_IDS.map((tvId) => {
                  const isRefreshing = refreshing.has(tvId);
                  return (
                    <button
                      key={tvId}
                      onClick={() => handleRefresh(tvId)}
                      disabled={isRefreshing}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[12px] text-zinc-400 hover:bg-white/[0.05] hover:text-white disabled:opacity-50"
                    >
                      <span>{TV_NAMES[tvId] ?? tvId}</span>
                      {isRefreshing ? (
                        <div className="h-3 w-3 animate-spin rounded-full border border-zinc-700 border-t-blue-500" />
                      ) : (
                        <svg className="h-3 w-3 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                        </svg>
                      )}
                    </button>
                  );
                })}
                <div className="my-1 border-t border-white/[0.06]" />
                <button
                  onClick={handleRefreshAll}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[12px] font-medium text-blue-400 hover:bg-blue-500/[0.08]"
                >
                  <span>Refresh All</span>
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {user?.image && (
            <img src={user.image} alt="" className="h-7 w-7 rounded-full ring-1 ring-white/10" />
          )}
          <span className="text-[13px] text-zinc-400">{user?.name}</span>
          <button
            onClick={() => signOut()}
            className="ml-1 rounded-lg px-2.5 py-1 text-[12px] text-zinc-600 hover:bg-white/5 hover:text-zinc-400"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
