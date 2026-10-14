"use client";
// Small pieces shared by the topic rows: the hidden-answer slot, pronunciation hints, who-says-it tags.

import Link from "next/link";
import { fold, frType } from "@/lib/content/french";
import type { Who } from "@/lib/content/schema";
import { Rich } from "../ui";
import { Icon } from "../Icon";
import type { Mode } from "../player";

/**
 * Stands in for hidden text. The real text is not in the page until shown (no length leak,
 * nothing for a screen reader to read early). Fixed width, keyboard reachable.
 */
export function Slot({ kind, heard, onClick }: { kind: "fr" | "en" | "listen" | "turn" | "wait"; heard?: boolean; onClick: () => void }) {
  const label =
    kind === "fr" ? "Show French" : kind === "en" ? "Show meaning" : kind === "turn" ? "Say it — or tap to hear" : kind === "wait" ? "Your line" : heard ? "Show" : "Listen";
  return (
    <button
      type="button"
      className={`slot slot-${kind}`}
      data-reveal=""
      aria-expanded={false}
      disabled={kind === "wait"}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <Icon name={kind === "turn" || kind === "wait" ? "mic" : kind === "listen" && !heard ? "play" : "eye"} size={16} />
      <span>{label}</span>
    </button>
  );
}

/** Which parts of a row are hidden in a quiz mode (before the row is shown). */
export function hiddenParts(mode: Mode, shown: boolean) {
  if (shown || mode === "all") return { fr: false, en: false, both: false, any: false };
  return { fr: mode === "hide-fr" || mode === "listen", en: mode === "hide-en" || mode === "listen", both: mode === "listen", any: true };
}

/** Anchors on /sounds. */
export function soundAnchor(say: string): string {
  const s = say.toLowerCase();
  if (/liaison|link|‿|enchaîn/.test(s)) return "liaison";
  if (/nasal|\b(an|on|in|en|un|ain|ein)\b/.test(s)) return "nasals";
  if (/e muet|silent e\b|\bthe e\b|schwa|ə/.test(s)) return "e-muet";
  if (/\bh\b|h muet|h aspiré/.test(s)) return "h";
  if (/silent|not pronounced|don't say|do not say|muet/.test(s)) return "silent-letters";
  if (/\bou\b|\/y\/|\/u\/|\bu\b/.test(s)) return "u-ou";
  if (/\br\b|ʁ|throat/.test(s)) return "r";
  return "";
}

/** A pronunciation hint, with a link to the French sounds page. */
export function SayHint({ say }: { say: string | null | undefined }) {
  if (!say) return null;
  const anchor = soundAnchor(say);
  return (
    <p className="say">
      <Icon name="headphones" size={15} />
      <span>
        <Rich text={say} />{" "}
        <Link href={`/sounds${anchor ? "#" + anchor : ""}`} className="say-link" onClick={(e) => e.stopPropagation()}>
          French sounds →
        </Link>
      </span>
    </p>
  );
}

/** "Eux" (the other person says it) or "Moi" (I say it). */
export function WhoTag({ who }: { who: Who | null | undefined }) {
  if (!who) return null;
  return (
    <span className={`who who-${who}`} title={who === "me" ? "You say this" : "The other person says this"}>
      <span lang="fr">{who === "me" ? "Moi" : "Eux"}</span>
      <span className="visually-hidden">{who === "me" ? " (you say this)" : " (the other person says this)"}</span>
    </span>
  );
}

export function FlagMarker() {
  return (
    <span className="flag-mark" role="img" aria-label="Flagged by the review">
      !
    </span>
  );
}

/** Masculine and feminine forms that are the same ("libre · libre") are not worth showing. */
export function usefulForms(forms: string | null | undefined): string | null {
  if (!forms) return null;
  const parts = forms.split(/\s*[·,]\s*/).map((p) => fold(p.trim())).filter(Boolean);
  return parts.length > 1 && parts.every((p) => p === parts[0]) ? null : forms;
}

/**
 * "Je voudrais … → un café · l'addition" (or the older "Je voudrais + [chose] : un café · l'addition")
 * → the frame (with its slot) and the fillers.
 */
export function parsePattern(pattern: string): { frame: string; fillers: string[] } {
  const m = pattern.match(/^(.*?)\s*→\s*(.*)$/) ?? pattern.match(/^(.*?)\s+:\s+(.*)$/);
  if (!m) return { frame: pattern, fillers: [] };
  return {
    frame: m[1].trim(),
    fillers: m[2]
      .split(/\s*[·;/]\s*/)
      .map((f) => f.trim())
      .filter(Boolean)
      .slice(0, 4),
  };
}

const SLOT = /(\[[^\]]+\]|…|\.\.\.)/;

/** The frame with the filler in its slot: "Je voudrais …" + "un café" → "Je voudrais un café". */
export function fillFrame(frame: string, filler: string): string {
  const out = SLOT.test(frame) ? frame.replace(/\s*\+?\s*(\[[^\]]+\]|…|\.\.\.)/, " " + filler) : `${frame} ${filler}`;
  const t = out.replace(/\s*\+\s*/g, " ").replace(/\s+([,.])/g, "$1").replace(/\s+/g, " ").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** The frame with its slot drawn as a blank to fill. React text only. */
export function Frame({ frame }: { frame: string }) {
  const parts = frame.split(new RegExp(SLOT.source, "g"));
  return (
    <span className="frame" lang="fr">
      {parts.map((p, i) =>
        SLOT.test(p) && (p === "…" || p === "..." || p.startsWith("[")) ? (
          <span className="blank" key={i} aria-label="blank">
            {p.startsWith("[") ? p.slice(1, -1) : "…"}
          </span>
        ) : (
          <span key={i}>{frType(p.replace(/\s*\+\s*$/, " ").replace(/^\s*\+\s*/, " "))}</span>
        ),
      )}
    </span>
  );
}

// ---------- word-level diff for "Your turn" ----------

const norm = (w: string) => fold(w).replace(/[^\p{L}\p{N}'’-]/gu, "").replace(/’/g, "'");

/** Words of `fixed`, each marked when it is not in the learner's sentence (accents ignored). */
export function diffWords(attempt: string, fixed: string): { word: string; changed: boolean }[] {
  const a = attempt.split(/\s+/).filter(Boolean).map(norm);
  const b = fixed.split(/\s+/).filter(Boolean);
  const bn = b.map(norm);
  // Longest common subsequence on the folded words.
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(bn.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = bn.length - 1; j >= 0; j--) dp[i][j] = a[i] === bn[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const keep = new Set<number>();
  let i = 0;
  let j = 0;
  while (i < a.length && j < bn.length) {
    if (a[i] === bn[j]) {
      keep.add(j);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  // Accent-only changes (cafe → café) still count as a change worth seeing; case and punctuation do not.
  const plain = (w: string) => w.toLowerCase().replace(/[.,!?;:«»"]/g, "").replace(/’/g, "'");
  const raw = new Set(attempt.split(/\s+/).filter(Boolean).map(plain));
  return b.map((word, k) => ({ word, changed: !keep.has(k) || !raw.has(plain(word)) }));
}
