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
  const btnClass = `flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
    disabled
      ? "bg-zinc-800 text-zinc-700 cursor-not-allowed"
      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
  }`;

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        className={btnClass}
        disabled={disabled}
        onClick={() => sendCommand(tvId, "previous")}
        title="Previous"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
        </svg>
      </button>

      <button
        className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
          disabled
            ? "bg-zinc-800 text-zinc-700 cursor-not-allowed"
            : "bg-blue-600 text-white hover:bg-blue-500"
        }`}
        disabled={disabled}
        onClick={() => sendCommand(tvId, "play")}
        title="Play"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>

      <button
        className={btnClass}
        disabled={disabled}
        onClick={() => sendCommand(tvId, "pause")}
        title="Pause"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 19h4V5H6zm8-14v14h4V5z" />
        </svg>
      </button>

      <button
        className={btnClass}
        disabled={disabled}
        onClick={() => sendCommand(tvId, "stop")}
        title="Stop"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 6h12v12H6z" />
        </svg>
      </button>

      <button
        className={btnClass}
        disabled={disabled}
        onClick={() => sendCommand(tvId, "next")}
        title="Next"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6z" />
        </svg>
      </button>
    </div>
  );
}
