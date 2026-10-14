"use client";
// Small shared pieces: play button, safe rich text, sheet, toast, fetch helper.

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { frType } from "@/lib/content/french";
import { speak, usePlayer } from "./player";

// ---------- fetch helper ----------

export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
  }
}

export async function api<T = unknown>(url: string, init?: { method?: string; json?: unknown; form?: FormData }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? (init?.json !== undefined || init?.form ? "POST" : "GET"),
    headers: init?.json !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = (body as { error?: { code?: string; message?: string } }).error;
    throw new ApiError(e?.code ?? "unknown", e?.message ?? "Something went wrong. Try again.", res.status);
  }
  return body as T;
}

// ---------- text ----------

/** French typography + *italic* without any raw HTML. */
export function Rich({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  const parts = frType(text).split(/(\*[^*]+\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("*") && p.endsWith("*") && p.length > 2 ? <em key={i}>{p.slice(1, -1)}</em> : <Fragment key={i}>{p}</Fragment>,
      )}
    </>
  );
}

export const Fr = ({ text }: { text: string }) => <>{frType(text)}</>;

// ---------- play button ----------

const ICON_PLAY = (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path fill="currentColor" d="M3 9v6h4l5 4V5L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z" />
  </svg>
);
const ICON_STOP = (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
  </svg>
);

export function PlayButton({ text, small }: { text: string; small?: boolean }) {
  const { playing, clips } = usePlayer();
  const recorded = Boolean(clips[text.trim()]);
  const active = playing === text;
  return (
    <button
      type="button"
      className={`icon-btn${recorded ? "" : " device"}${active ? " busy" : ""}`}
      style={small ? { width: 28, height: 28 } : undefined}
      aria-label={`${active ? "Stop" : "Play"}: ${text}${recorded ? "" : " (device voice)"}`}
      title={recorded ? "Play" : "Play with the device voice (less reliable)"}
      onClick={(e) => {
        e.stopPropagation();
        void speak(text);
      }}
    >
      {active ? ICON_STOP : ICON_PLAY}
    </button>
  );
}

// ---------- sheet ----------

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    ref.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="btn btn-ghost btn-small close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

// ---------- toast ----------

let pushToast: ((msg: string) => void) | null = null;
export function toast(msg: string) {
  pushToast?.(msg);
}
export function Toaster() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    pushToast = (m) => {
      setMsg(m);
      clearTimeout(t);
      t = setTimeout(() => setMsg(null), 3500);
    };
    return () => {
      pushToast = null;
    };
  }, []);
  return msg ? (
    <div className="toast" role="status" aria-live="polite">
      {msg}
    </div>
  ) : null;
}

export function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}
