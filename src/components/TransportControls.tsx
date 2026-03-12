"use client";

type TransportControlsProps = {
  tvId: string;
  disabled: boolean;
};

async function sendCommand(tvId: string, action: string, payload?: Record<string, unknown>) {
  await fetch("/api/commands", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tv_id: tvId, action, payload }),
  });
}

export function TransportControls({ tvId, disabled }: TransportControlsProps) {
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
  );
}
