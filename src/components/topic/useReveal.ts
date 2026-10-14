"use client";
// Tap-to-reveal for the quiz modes, as one small store for the page, so "Reveal all", playback
// ("reveal after it played") and the keyboard can all change a row without prop drilling.
// A row's key is `${scope}:${lineId}`; the guided study uses its own scope.
// In "Listen first" the first tap plays the line (heard), the second shows it.

import { useSyncExternalStore } from "react";
import { speak, type Mode } from "../player";

export type { Mode };

let all = false; // "Reveal all" was pressed: every row shows unless hidden again one by one
const overrides = new Map<string, boolean>();
const heard = new Set<string>();
let version = 0;
const listeners = new Set<() => void>();
function changed() {
  version++;
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export const isShown = (key: string) => overrides.get(key) ?? all;

/** 0 hidden · 1 heard (Listen first, not shown yet) · 2 shown */
function code(key: string) {
  return isShown(key) ? 2 : heard.has(key) ? 1 : 0;
}

export function useRevealState(key: string): { shown: boolean; heard: boolean } {
  const c = useSyncExternalStore(
    subscribe,
    () => code(key),
    () => 0,
  );
  return { shown: c === 2, heard: c >= 1 };
}

/** True after "Reveal all" (the bar then offers "Hide all"). */
export function useAllShown() {
  return useSyncExternalStore(
    subscribe,
    () => all,
    () => false,
  );
}
/** Changes whenever any row changes (for "N of M shown"-style reads). */
export function useRevealVersion() {
  return useSyncExternalStore(
    subscribe,
    () => version,
    () => 0,
  );
}

export function reveal(key: string, shown = true) {
  overrides.set(key, shown);
  changed();
}
export function toggleReveal(key: string) {
  reveal(key, !isShown(key));
}
export function revealAll(shown: boolean) {
  all = shown;
  overrides.clear();
  changed();
}
/** Back to everything hidden (mode change, guided study step). */
export function resetReveal() {
  all = false;
  overrides.clear();
  heard.clear();
  changed();
}

/**
 * What a tap on a hidden row does. Listen first: first tap plays, second shows.
 * Other quiz modes: show (or hide again when already shown).
 */
export function tapRow(key: string, mode: Mode, text: string) {
  if (mode === "all") return;
  if (mode === "listen" && !heard.has(key) && !isShown(key)) {
    heard.add(key);
    changed();
    void speak(text);
    return;
  }
  toggleReveal(key);
}
