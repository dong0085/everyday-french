"use client";
// Small shared pieces: fetch helper, safe rich text, play button, sheet, confirm dialog, switch, toast.

import { Fragment, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { frType } from "@/lib/content/french";
import { speak, usePlayer } from "./player";
import { Icon } from "./Icon";

// ---------- fetch helper ----------

export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
  }
}

export async function api<T = unknown>(url: string, init?: { method?: string; json?: unknown; form?: FormData }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init?.method ?? (init?.json !== undefined || init?.form ? "POST" : "GET"),
      headers: init?.json !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init?.json !== undefined ? JSON.stringify(init.json) : init?.form,
    });
  } catch {
    // fetch only rejects when the request never got an answer: offline, or the connection dropped.
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    throw new ApiError(
      "offline",
      offline ? "You're offline. Check your connection and try again." : "Couldn't reach Everyday French. Check your connection and try again.",
      0,
    );
  }
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

/** A Chinese gloss, marked so browsers pick Simplified Chinese glyphs. */
export function Zh({ text, className = "zh" }: { text: string | null | undefined; className?: string }) {
  if (!text) return null;
  return (
    <div className={className} lang="zh-Hans">
      {text}
    </div>
  );
}

// ---------- play button ----------

export function PlayButton({ text, small, label }: { text: string; small?: boolean; label?: string }) {
  const { playing, clips } = usePlayer();
  const recorded = Boolean(clips[text.trim()]);
  const active = playing === text;
  return (
    <button
      type="button"
      className={`icon-btn${small ? " small" : ""}${recorded ? "" : " device"}${active ? " busy" : ""}`}
      aria-label={`${active ? "Stop" : "Play"}: ${label ?? text}${recorded ? "" : " (device voice)"}`}
      title={recorded ? "Play" : "Play with the device voice (less reliable)"}
      onClick={(e) => {
        e.stopPropagation();
        void speak(text);
      }}
    >
      <Icon name={active ? "stop" : "speaker"} size={small ? 16 : 20} />
    </button>
  );
}

// ---------- sheet ----------

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Bottom sheet on phones, centred dialog on desktop. Traps focus, closes on Escape, gives focus back on close. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return closeRef.current();
      if (e.key !== "Tab" || !ref.current) return;
      const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    ref.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      before?.focus?.();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={ref} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-btn plain" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        {children}
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

// ---------- confirm dialog (replaces window.confirm / prompt) ----------

export type ConfirmOptions = {
  title: string;
  body?: ReactNode;
  /** What will happen, one line each. */
  consequences?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** The person must type this exact text to confirm (for account deletion). */
  typed?: string;
};

let pushConfirm: ((o: ConfirmOptions, done: (ok: boolean) => void) => void) | null = null;

/** Asks a yes/no question in a sheet. Resolves true when confirmed. */
export function confirmDialog(o: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!pushConfirm) return resolve(window.confirm(o.title));
    pushConfirm(o, resolve);
  });
}

function ConfirmHost() {
  const [req, setReq] = useState<{ o: ConfirmOptions; done: (ok: boolean) => void } | null>(null);
  const [typed, setTyped] = useState("");
  useEffect(() => {
    pushConfirm = (o, done) => {
      setTyped("");
      setReq({ o, done });
    };
    return () => {
      pushConfirm = null;
    };
  }, []);
  const finish = (ok: boolean) => {
    req?.done(ok);
    setReq(null);
  };
  const o = req?.o;
  const ready = !o?.typed || typed.trim() === o.typed;
  return (
    <Sheet
      open={Boolean(req)}
      onClose={() => finish(false)}
      title={o?.title ?? ""}
      footer={
        <>
          <button type="button" className="btn" onClick={() => finish(false)}>
            {o?.cancelLabel ?? "Cancel"}
          </button>
          <button type="button" className={`btn ${o?.danger ? "btn-danger-fill" : "btn-primary"}`} disabled={!ready} onClick={() => finish(true)}>
            {o?.confirmLabel ?? "OK"}
          </button>
        </>
      }
    >
      {o?.body && <div className="stack-sm">{typeof o.body === "string" ? <p className="m-0">{o.body}</p> : o.body}</div>}
      {o?.consequences && o.consequences.length > 0 && (
        <ul className="consequences">
          {o.consequences.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      )}
      {o?.typed && (
        <label className="field mt-4">
          <span>
            Type <strong>{o.typed}</strong> to confirm
          </span>
          <input type="text" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="off" spellCheck={false} />
        </label>
      )}
    </Sheet>
  );
}

// ---------- switch ----------

export function Switch({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className="switch" onClick={() => onChange(!checked)} disabled={disabled}>
      <span className="track" />
      <span>
        <span>{label}</span>
        {hint && <span className="hint" style={{ display: "block" }}>{hint}</span>}
      </span>
    </button>
  );
}

// ---------- toast ----------

type ToastTone = "info" | "error";
let pushToast: ((msg: string, tone: ToastTone) => void) | null = null;

/** A short message at the bottom of the screen. Errors stay longer and are announced right away. */
export function toast(msg: string, opts?: { tone?: ToastTone }) {
  pushToast?.(msg, opts?.tone ?? "info");
}
export function toastError(e: unknown) {
  toast(e instanceof Error ? e.message : "Something went wrong. Try again.", { tone: "error" });
}

export function Toaster() {
  const [msg, setMsg] = useState<{ text: string; tone: ToastTone } | null>(null);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    pushToast = (text, tone) => {
      setMsg({ text, tone });
      clearTimeout(t);
      t = setTimeout(() => setMsg(null), tone === "error" ? 8000 : 3500);
    };
    return () => {
      pushToast = null;
      clearTimeout(t);
    };
  }, []);
  // The live regions stay mounted, so screen readers announce text that appears in them.
  return (
    <>
      <div className="toast-region" role="status" aria-live="polite">
        {msg?.tone === "info" && (
          <div className="toast">
            <span>{msg.text}</span>
          </div>
        )}
      </div>
      <div className="toast-region" role="alert" aria-live="assertive">
        {msg?.tone === "error" && (
          <div className="toast error">
            <span>{msg.text}</span>
            <button type="button" onClick={() => setMsg(null)} aria-label="Dismiss">
              <Icon name="close" size={16} />
            </button>
          </div>
        )}
      </div>
      <ConfirmHost />
    </>
  );
}

export function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}
