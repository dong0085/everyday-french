"use client";
// Registers public/sw.js in production builds. The worker only shows a static "You're offline" page
// when a page can't load; it never caches API answers or signed-in pages.

import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);
  return null;
}
