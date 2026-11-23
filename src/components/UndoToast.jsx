import { useEffect, useState, useRef } from "react";

export default function UndoToast({
  message,
  onUndo,
  onDismiss,
  duration = 4000,
  actionText = "Urungkan",
}) {
  const [secondsLeft, setSecondsLeft] = useState(() => Math.ceil(duration / 1000));
  const onDismissRef = useRef(onDismiss);
  const onUndoRef = useRef(onUndo);

  useEffect(() => {
    onDismissRef.current = onDismiss;
    onUndoRef.current = onUndo;
  }, [onDismiss, onUndo]);

  useEffect(() => {
    const endTime = Date.now() + duration;
    setSecondsLeft(Math.ceil(duration / 1000));

    const intervalId = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        window.clearInterval(intervalId);
      }
    }, 200);

    const timeoutId = window.setTimeout(() => {
      onDismissRef.current?.();
    }, duration);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [duration]);

  return (
    <aside
      role="status"
      aria-live="polite"
      className="da-undo-toast fixed bottom-24 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md flex-col overflow-hidden rounded-2xl border border-[#F5F3EE]/25 bg-[#0B1F4B]/95 p-3.5 shadow-2xl backdrop-blur-md lg:bottom-8"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#FF5A4F]/20 text-[#FF8A81]"
            aria-hidden="true"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </span>
          <p className="min-w-0 truncate text-sm font-medium text-[#F5F3EE]" title={message}>
            {message}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onUndoRef.current?.()}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#FF5A4F] px-3.5 py-1.5 text-xs font-semibold text-white shadow-md transition hover:bg-[#FF766D] active:scale-95"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 10h10a5 5 0 015 5v2M3 10l6-6m-6 6l6 6"
              />
            </svg>
            <span>
              {actionText} ({secondsLeft}s)
            </span>
          </button>
          <button
            type="button"
            onClick={() => onDismissRef.current?.()}
            aria-label="Tutup notifikasi"
            className="grid h-7 w-7 place-items-center rounded-full text-xs text-[#F5F3EE]/60 transition hover:bg-[#F5F3EE]/10 hover:text-[#F5F3EE]"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 4-second animated progress bar */}
      <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-white/10" aria-hidden="true">
        <div
          className="h-full bg-gradient-to-r from-[#FF5A4F] to-[#FF8A81]"
          style={{
            animation: `da-undo-progress ${duration}ms linear forwards`,
          }}
        />
      </div>
    </aside>
  );
}
