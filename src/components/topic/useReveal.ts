"use client";
// Tap-to-reveal for quiz modes. In "Listen first", the first tap plays the line, the second shows it.
// State resets whenever the mode changes or "Reveal all" is pressed (a new epoch).

import { useState } from "react";
import { speak, type Mode } from "../player";

export type { Mode };

export function useReveal(mode: Mode, revealAll: number, text: string) {
  const epoch = `${mode}|${revealAll}`;
  const [st, setSt] = useState({ epoch, revealed: false, heard: false });
  const cur = st.epoch === epoch ? st : { epoch, revealed: revealAll > 0, heard: false };

  const onClick = (e: React.MouseEvent) => {
    if (mode === "all") return;
    if ((e.target as HTMLElement).closest("button, a, input, textarea, select")) return;
    if (mode === "listen" && !cur.heard && !cur.revealed) {
      setSt({ ...cur, heard: true });
      void speak(text);
      return;
    }
    setSt({ ...cur, revealed: !cur.revealed });
  };
  return { revealed: cur.revealed, onClick };
}
