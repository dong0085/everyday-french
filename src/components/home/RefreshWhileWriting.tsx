"use client";
// While a topic is being written, refresh the home page every 5 s (and when the tab comes back),
// so "Writing…" turns into the finished topic without a manual reload.

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function RefreshWhileWriting({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(tick, 5000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [active, router]);
  return null;
}
