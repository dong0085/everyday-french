"use client";
// Review options kept on this device: which side shows first, and whether the French plays on reveal.

import { useSyncExternalStore } from "react";
import type { Side } from "./cards";

type Prefs = { side: Side; autoplay: boolean };
const SIDES: Side[] = ["auto", "meaning", "french", "listen"];
const DEFAULT: Prefs = { side: "auto", autoplay: true };

let prefs: Prefs | null = null;
const listeners = new Set<() => void>();

function read(): Prefs {
  if (prefs) return prefs;
  try {
    const side = localStorage.getItem("ef.reviewSide") as Side | null;
    prefs = { side: side && SIDES.includes(side) ? side : "auto", autoplay: localStorage.getItem("ef.reviewAutoplay") !== "0" };
  } catch {
    prefs = DEFAULT;
  }
  return prefs;
}

function save(patch: Partial<Prefs>) {
  prefs = { ...read(), ...patch };
  try {
    localStorage.setItem("ef.reviewSide", prefs.side);
    localStorage.setItem("ef.reviewAutoplay", prefs.autoplay ? "1" : "0");
  } catch {}
  listeners.forEach((l) => l());
}

export const setSide = (side: Side) => save({ side });
export const setAutoplay = (autoplay: boolean) => save({ autoplay });

export function useReviewPrefs(): Prefs {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => DEFAULT,
  );
}
