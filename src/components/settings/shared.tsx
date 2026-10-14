"use client";
// Pieces shared by the Settings groups: types, the group frame, the "Saved ✓" tick, and helpers
// that describe a connection in plain words.

import type { ReactNode } from "react";
import type { Level } from "@/lib/content/schema";
import { provider as providerInfo, providersFor, topicCostUsd, type Use } from "@/lib/providers/catalog";
import { approx } from "@/lib/format";
import { Icon } from "../Icon";

export type Conn = { provider: string; model: string; keyId?: string | null; voice?: string; voiceName?: string } | null;
export type Key = { id: string; provider: string; label: string; baseUrl: string | null; last4: string; createdAt: string; lastUsedAt: string | null };
export type Usage = { topicsTokens: number; llmCalls: number; ttsChars: number; ttsClips: number; sttSeconds: number; costUsd: number; topics: number };
export type Profile = {
  level: Level;
  selfGender: "m" | "f" | "x";
  explainLang: "en" | "zh";
  zhGloss: boolean;
  l1: "zh" | "en" | "other";
  llm: Conn;
  tts: Conn;
  stt: Conn;
  email: string | null;
};

/** Save a profile change: body goes to the API, local updates the screen at once, field names the "Saved ✓" spot. */
export type Patch = (body: Record<string, unknown>, local: Partial<Profile>, field: string) => Promise<void>;

export const USE_FIELD: Record<Use, "llm" | "tts" | "stt"> = { text: "llm", speech: "tts", transcribe: "stt" };

export function Group({ id, title, hint, children, className }: { id: string; title: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`settings-group${className ? ` ${className}` : ""}`} id={id} aria-labelledby={`${id}-title`}>
      <h2 className="group-title" id={`${id}-title`}>
        {title}
      </h2>
      {hint && <p className="hint group-hint">{hint}</p>}
      <div className="card group-card">{children}</div>
    </section>
  );
}

/** A small "Saved ✓" next to the control that just saved. */
export function SavedTick({ show }: { show: boolean }) {
  return (
    <span className="save-tick" aria-live="polite">
      {show && (
        <span className="fade-in">
          <Icon name="check" size={14} /> Saved
        </span>
      )}
    </span>
  );
}

export const providerName = (id: string) => providerInfo(id)?.name ?? id;

/** Does this connection run on this key? (Older connections have no keyId: then it is the provider's only key.) */
export function usesKey(c: Conn, k: Key) {
  return Boolean(c && c.provider === k.provider && (!c.keyId || c.keyId === k.id));
}

export function describeText(c: NonNullable<Conn>) {
  const m = providerInfo(c.provider)?.textModels?.find((x) => x.id === c.model);
  const cost = topicCostUsd(c.provider, c.model);
  return { main: `${providerName(c.provider)} · ${m?.label ?? c.model}`, cost: cost !== null ? `≈ ${approx(cost)} per topic` : null };
}

export function describeSpeech(c: NonNullable<Conn>) {
  const m = providerInfo(c.provider)?.speechModels?.find((x) => x.id === c.model);
  return { main: `${c.voiceName ?? c.voice ?? "Voice"} · ${providerName(c.provider)}`, model: m?.label ?? c.model };
}

export function describeMemos(c: NonNullable<Conn>) {
  const m = providerInfo(c.provider)?.transcribeModels?.find((x) => x.id === c.model);
  return { main: `${providerName(c.provider)} · ${m?.label ?? c.model}` };
}

/** Providers with a saved key for this use (the test-only mock counts while it is the current choice). */
export function connectedFor(use: Use, keys: Key[], current: Conn, allowMock: boolean) {
  return providersFor(use, allowMock).filter((pr) => (pr.id === "mock" ? current?.provider === "mock" : keys.some((k) => k.provider === pr.id)));
}

export const shortDate = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "never");
