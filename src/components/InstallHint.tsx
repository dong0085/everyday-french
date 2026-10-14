"use client";
// One-time hint to add the app to the home screen, shown after the learner's first real topic.

import { useEffect, useState, useSyncExternalStore } from "react";

type InstallEvent = Event & { prompt: () => Promise<void> };

function hintAllowed(): boolean {
  try {
    if (localStorage.getItem("ef.installHint") === "done") return false;
  } catch {}
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
  return !standalone;
}
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const noop = () => () => {};

export function InstallHint() {
  const allowed = useSyncExternalStore(noop, hintAllowed, () => false);
  const ios = useSyncExternalStore(noop, isIos, () => false);
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem("ef.installHint", "done");
    } catch {}
  };

  if (!allowed || dismissed || (!ios && !evt)) return null;
  return (
    <div className="banner" style={{ marginTop: 24 }}>
      <p className="small">
        {ios ? "Add Everyday French to your home screen: tap Share, then “Add to Home Screen”." : "Install Everyday French to open it like an app."}
      </p>
      <div className="row">
        {evt && (
          <button
            className="btn btn-small btn-primary"
            onClick={async () => {
              await evt.prompt();
              dismiss();
            }}
          >
            Install
          </button>
        )}
        <button className="btn btn-small btn-ghost" onClick={dismiss}>
          Not now
        </button>
      </div>
    </div>
  );
}
