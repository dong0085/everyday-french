import type { Metadata } from "next";
import { Icon } from "@/components/Icon";

// Cached by public/sw.js (signed out) and shown when a page can't load. Plain links only:
// the cached copy may not have its scripts.
export const metadata: Metadata = { title: "Offline" };

export default function Offline() {
  return (
    <main className="page state-page">
      <div className="state-icon" aria-hidden="true">
        <Icon name="wifi-off" size={28} />
      </div>
      <h1>
        <span lang="fr">Tu es hors ligne</span>
        <span className="h-en">You&apos;re offline</span>
      </h1>
      <p className="sub">Everyday French needs the internet to load your topics. Try again when you&apos;re connected.</p>
      <div className="row mt-4">
        {/* A full page load on purpose: it retries the network. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="btn btn-primary">
          Try again
        </a>
      </div>
    </main>
  );
}
