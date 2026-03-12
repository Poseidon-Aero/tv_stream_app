"use client";

import { signOut } from "next-auth/react";

type HeaderProps = {
  user: { name?: string | null; image?: string | null } | undefined;
};

export function Header({ user }: HeaderProps) {
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

        <div className="flex items-center gap-2">
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
