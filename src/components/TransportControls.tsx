"use client";

import { useRef, useState } from "react";

type TransportControlsProps = {
  tvId: string;
  disabled: boolean;
  positionSec?: number;
  durationSec?: number;
};

async function sendCommand(tvId: string, action: string, payload?: Record<string, unknown>) {
  await fetch("/api/commands", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tv_id: tvId, action, payload }),
  });
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TransportControls({ tvId, disabled, positionSec = 0, durationSec = 0 }: TransportControlsProps) {
  const [dragging, setDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);
  const seekTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const progress = durationSec > 0 ? (dragging ? dragValue : positionSec) / durationSec * 100 : 0;

  function handleSeekChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseFloat(e.target.value);
    if (!dragging) setDragging(true);
    setDragValue(val);
    // Debounce the actual seek command
    if (seekTimeout.current) clearTimeout(seekTimeout.current);
    seekTimeout.current = setTimeout(() => {
      sendCommand(tvId, "seek", { position: val });
    }, 200);
  }

  function handleSeekEnd() {
    if (seekTimeout.current) clearTimeout(seekTimeout.current);
    sendCommand(tvId, "seek", { position: dragValue });
    setDragging(false);
  }

  const btn = (size: "sm" | "lg" = "sm") =>
    size === "lg"
      ? `flex h-10 w-10 items-center justify-center rounded-xl ${
          disabled
            ? "bg-white/[0.03] text-zinc-700 cursor-not-allowed"
            : "bg-blue-500 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-400 active:scale-95"
        }`
      : `flex h-8 w-8 items-center justify-center rounded-lg ${
          disabled
            ? "bg-white/[0.03] text-zinc-700 cursor-not-allowed"
            : "bg-white/[0.05] text-zinc-400 hover:bg-white/[0.08] hover:text-white active:scale-95"
        }`;

  return (
    <div className="space-y-2">
      {/* Seek bar */}
      {durationSec > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] tabular-nums text-zinc-600 w-8 text-right">
            {formatTime(dragging ? dragValue : positionSec)}
          </span>
          <div className="relative flex-1 group">
            <div className="h-[3px] w-full rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={durationSec}
              step={0.5}
              value={dragging ? dragValue : positionSec}
              disabled={disabled}
              onChange={handleSeekChange}
              onMouseUp={handleSeekEnd}
              onTouchEnd={handleSeekEnd}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
          </div>
          <span className="text-[10px] tabular-nums text-zinc-600 w-8">
            {formatTime(durationSec)}
          </span>
        </div>
      )}

      {/* Transport buttons */}
      <div className="flex items-center justify-center gap-1.5">
        <button className={btn()} disabled={disabled} onClick={() => sendCommand(tvId, "previous")} title="Previous">
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /></svg>
        </button>
        <button className={btn("lg")} disabled={disabled} onClick={() => sendCommand(tvId, "play")} title="Play">
          <svg className="h-4 w-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
        </button>
        <button className={btn()} disabled={disabled} onClick={() => sendCommand(tvId, "pause")} title="Pause">
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6zm8-14v14h4V5z" /></svg>
        </button>
        <button className={btn()} disabled={disabled} onClick={() => sendCommand(tvId, "stop")} title="Stop">
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z" /></svg>
        </button>
        <button className={btn()} disabled={disabled} onClick={() => sendCommand(tvId, "next")} title="Next">
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6z" /></svg>
        </button>
      </div>
    </div>
  );
}
