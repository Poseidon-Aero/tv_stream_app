"use client";

import { signOut } from "next-auth/react";

type HeaderProps = {
  user: { name?: string | null; image?: string | null } | undefined;
  view: "tvs" | "library";
  onViewChange: (view: "tvs" | "library") => void;
  selectedTv: string;
  onSelectTv: (tv: string) => void;
};

export function Header({ user, view, onViewChange, selectedTv, onSelectTv }: HeaderProps) {
  return (
    <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-semibold">TV Command Center</h1>

          <nav className="flex gap-1 rounded-lg bg-zinc-800 p-1">
            <button
              onClick={() => onViewChange("tvs")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "tvs"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              TV Panels
            </button>
            <button
              onClick={() => onViewChange("library")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "library"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Video Library
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {view === "library" && (
            <select
              value={selectedTv}
              onChange={(e) => onSelectTv(e.target.value)}
              className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm text-white border border-zinc-700"
            >
              <option value="tv-1">TV 1</option>
              <option value="tv-2">TV 2</option>
              <option value="tv-3">TV 3</option>
            </select>
          )}

          <div className="flex items-center gap-3">
            {user?.image && (
              <img
                src={user.image}
                alt=""
                className="h-7 w-7 rounded-full"
              />
            )}
            <span className="text-sm text-zinc-400">{user?.name}</span>
            <button
              onClick={() => signOut()}
              className="rounded-md px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
