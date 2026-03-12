"use client";

type ActionBarProps = {
  selectedVideoCount: number;
  selectedTvCount: number;
  sending: boolean;
  onSend: () => void;
  onClear: () => void;
};

export function ActionBar({
  selectedVideoCount,
  selectedTvCount,
  sending,
  onSend,
  onClear,
}: ActionBarProps) {
  if (selectedVideoCount === 0 && selectedTvCount === 0) return null;

  const canSend = selectedVideoCount > 0 && selectedTvCount > 0;

  return (
    <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 animate-in slide-in-from-bottom-4 fade-in duration-200">
      <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-zinc-900/95 px-5 py-2.5 shadow-2xl shadow-black/60 backdrop-blur-xl ring-1 ring-white/[0.04]">
        {/* Counts */}
        <div className="flex items-center gap-2">
          {selectedVideoCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-2.5 py-1 text-[12px] font-medium text-blue-400 ring-1 ring-blue-500/20">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              {selectedVideoCount}
            </span>
          )}
          {selectedTvCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[12px] font-medium text-emerald-400 ring-1 ring-emerald-500/20">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {selectedTvCount}
            </span>
          )}
        </div>

        <div className="h-5 w-px bg-white/[0.06]" />

        <button
          onClick={onClear}
          className="rounded-lg px-2 py-1 text-[12px] text-zinc-500 hover:text-zinc-300"
        >
          Clear
        </button>
        <button
          onClick={onSend}
          disabled={!canSend || sending}
          className={`rounded-xl px-4 py-1.5 text-[12px] font-semibold ${
            canSend && !sending
              ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-400 active:scale-[0.97]"
              : "bg-white/[0.04] text-zinc-600 cursor-not-allowed"
          }`}
        >
          {sending ? "Sending..." : canSend ? `Queue ${selectedVideoCount} on ${selectedTvCount} TV${selectedTvCount > 1 ? "s" : ""}` : selectedVideoCount === 0 ? "Pick videos" : "Pick TVs"}
        </button>
      </div>
    </div>
  );
}
