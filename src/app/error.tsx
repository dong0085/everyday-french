"use client";
// Calm error page. It does not guess from the message (production hides server messages):
// offline → "You're offline"; anything else → "Something went wrong" + an error code for support.

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Icon } from "@/components/Icon";

const subscribe = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

export default function Error({ error, retry, reset }: { error: Error & { digest?: string }; retry?: () => void; reset: () => void }) {
  const offline = useSyncExternalStore(subscribe, () => navigator.onLine === false, () => false);
  const again = retry ?? reset;
  return (
    <main className="page state-page">
      <div className="state-icon" aria-hidden="true">
        <Icon name={offline ? "wifi-off" : "info"} size={28} />
      </div>
      {offline ? (
        <>
          <h1>
            <span lang="fr">Tu es hors ligne</span>
            <span className="h-en">You&apos;re offline</span>
          </h1>
          <p className="sub">Your topics will be here when you&apos;re back online.</p>
        </>
      ) : (
        <>
          <h1>Something went wrong</h1>
          <p className="sub">Please try again. Nothing you made is lost.</p>
        </>
      )}
      <div className="row mt-4">
        <button type="button" className="btn btn-primary" onClick={() => again()}>
          <Icon name="repeat" size={18} /> Try again
        </button>
        <Link href="/" className="btn">
          Go to my topics
        </Link>
      </div>
      {error.digest && !offline && <p className="hint mt-6">Error code: {error.digest}</p>}
    </main>
  );
}
