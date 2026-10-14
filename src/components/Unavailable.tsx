"use client";
// Shown by pages when the database can't be reached (DbUnavailableError from src/lib/data.ts).
// Says plainly that nothing is lost, instead of showing an empty library.

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Icon } from "./Icon";
import { Spinner } from "./ui";

export function Unavailable() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <main className="page state-page">
      <div className="state-icon" aria-hidden="true">
        <Icon name="book" size={28} />
      </div>
      <h1>
        <span lang="fr">Everyday French se repose</span>
        <span className="h-en">Everyday French is resting</span>
      </h1>
      <p className="sub">We can&apos;t reach the database right now. Your topics are safe. Please try again in a few minutes.</p>
      <div className="row mt-4">
        <button type="button" className="btn btn-primary" disabled={pending} onClick={() => start(() => router.refresh())}>
          {pending ? <Spinner /> : <Icon name="repeat" size={18} />} Try again
        </button>
      </div>
      <p className="hint mt-6">If this lasts more than a day, the free database may be paused. The person who runs the app needs to restore it.</p>
    </main>
  );
}
