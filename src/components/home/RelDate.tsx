"use client";
// "Today", "Yesterday", "Monday", "12 Oct": in the learner's own time zone, so it is worked out in the
// browser. The server (and hydration) shows a plain UTC date; the relative words replace it right after.

import { useSyncExternalStore } from "react";

const noop = () => () => {};
// Stable for the whole day, so React does not re-render in a loop.
const today = () => new Date().toDateString();

export function relDate(iso: string, todayString: string | null): string {
  const d = new Date(iso);
  if (!todayString) return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const now = new Date(todayString);
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((now.getTime() - day.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff > 1 && diff < 7) return d.toLocaleDateString("en-GB", { weekday: "long" });
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(d.getFullYear() !== now.getFullYear() && { year: "numeric" }) });
}

export function RelDate({ iso }: { iso: string }) {
  const day = useSyncExternalStore(noop, today, () => null);
  return <time dateTime={iso}>{relDate(iso, day)}</time>;
}
