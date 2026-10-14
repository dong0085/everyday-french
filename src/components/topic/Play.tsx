"use client";
// Play buttons for the topic page. Each one subscribes only to its own line, so a long topic
// does not re-render every button on every player event.

import type { ReactNode } from "react";
import { playAll, speak, stop, usePlayerSelector, type PlayAllOptions } from "../player";
import { Icon } from "../Icon";

export function Play({ text, small, label }: { text: string; small?: boolean; label?: string }) {
  const t = text.trim();
  const active = usePlayerSelector((s) => s.playing === text || s.mine === text);
  const recorded = usePlayerSelector((s) => Boolean(s.clips[t]));
  const fellBack = usePlayerSelector((s) => s.fallback === text);
  const device = !recorded || fellBack;
  return (
    <button
      type="button"
      className={`icon-btn${small ? " small" : ""}${device ? " device" : ""}${active ? " busy" : ""}`}
      aria-label={`${active ? "Stop" : "Play"}: ${label ?? text}${device ? " (device voice)" : ""}`}
      title={device ? "Play with the device voice" : "Play the recording"}
      onClick={(e) => {
        e.stopPropagation();
        void speak(text);
      }}
    >
      <Icon name={active ? "stop" : "speaker"} size={small ? 16 : 20} />
    </button>
  );
}

/** "Play words", "Play my story"… — turns into Stop while its list plays. */
export function PlayList({
  id,
  lines,
  children,
  className = "btn btn-small",
  onLine,
  options,
}: {
  id: string;
  lines: string[];
  children: ReactNode;
  className?: string;
  onLine?: (i: number) => void;
  options?: Omit<PlayAllOptions, "id">;
}) {
  const playing = usePlayerSelector((s) => s.list === id);
  return (
    <button
      type="button"
      className={`${className}${playing ? " is-playing" : ""}`}
      disabled={!lines.length}
      onClick={() => (playing ? stop() : void playAll(lines, onLine, { ...options, id }))}
    >
      <Icon name={playing ? "stop" : "play"} size={18} />
      {playing ? "Stop" : children}
    </button>
  );
}
