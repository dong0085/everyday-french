"use client";

import { useState, useSyncExternalStore } from "react";
import { Group, SavedTick } from "./shared";

type Theme = "system" | "light" | "dark";

// The layout's theme script sets data-theme before first paint; read it from there.
const readTheme = (): Theme => {
  const t = document.documentElement.dataset.theme;
  return t === "light" || t === "dark" ? t : "system";
};
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

function applyTheme(t: Theme) {
  try {
    if (t === "system") localStorage.removeItem("ef.theme");
    else localStorage.setItem("ef.theme", t);
  } catch {}
  if (t === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
  listeners.forEach((l) => l());
}

export function AppearanceGroup() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "system" as Theme);
  const [saved, setSaved] = useState(false);
  return (
    <Group id="appearance" title="Appearance">
      <div className="setting" role="group" aria-labelledby="set-theme">
        <div className="setting-head">
          <span className="label" id="set-theme">
            Colours
          </span>
          <SavedTick show={saved} />
        </div>
        <div className="seg">
          {(
            [
              ["system", "System"],
              ["light", "Light"],
              ["dark", "Dark"],
            ] as [Theme, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={theme === k}
              onClick={() => {
                applyTheme(k);
                setSaved(true);
                setTimeout(() => setSaved(false), 1800);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="hint">System follows your device. Saved on this device only.</span>
      </div>
    </Group>
  );
}
