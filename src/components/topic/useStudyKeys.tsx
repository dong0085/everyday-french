"use client";
// Desktop keyboard: J/K or ↓/↑ move between lines, Space plays, Enter shows, R repeat, S speed,
// 1–4 choose the mode, ? lists the keys. Never while typing, and never with a dialog open.

import { useEffect } from "react";
import { Sheet } from "../ui";
import { cycleSpeed, playerState, setRepeat, speak, type Mode } from "../player";
import { chooseMode } from "./StudyBar";

const MODE_KEYS: Record<string, Mode> = { "1": "all", "2": "hide-fr", "3": "hide-en", "4": "listen" };

export function useStudyKeys(onHelp: () => void) {
  useEffect(() => {
    let current: HTMLElement | null = null;
    const root = () => document.querySelector<HTMLElement>(".guided") ?? document.querySelector<HTMLElement>("main.topic-page");
    const rows = () => [...(root()?.querySelectorAll<HTMLElement>("[data-row]") ?? [])].filter((el) => el.offsetParent !== null);
    const setCurrent = (el: HTMLElement | null) => {
      current?.classList.remove("kb-current");
      current = el;
      if (!el) return;
      el.classList.add("kb-current");
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable=true], [role=dialog], [role=menu]")) return;
      if (document.querySelector(".sheet-backdrop")) return;
      const onControl = Boolean(t.closest("button, a, summary"));
      const list = rows();
      const k = e.key;
      if (k === "j" || k === "k" || ((k === "ArrowDown" || k === "ArrowUp") && current)) {
        if (!list.length) return;
        e.preventDefault();
        const i = current ? list.indexOf(current) : -1;
        const down = k === "j" || k === "ArrowDown";
        setCurrent(list[Math.max(0, Math.min(list.length - 1, i < 0 ? 0 : i + (down ? 1 : -1)))]);
      } else if (k === " " && current && !onControl) {
        e.preventDefault();
        const text = current.dataset.text;
        if (text) void speak(text);
      } else if (k === "Enter" && current && !onControl) {
        const slot = current.querySelector<HTMLElement>("[data-reveal]");
        if (slot) {
          e.preventDefault();
          slot.click();
        } else if (playerState().mode !== "all") {
          e.preventDefault();
          current.click(); // hide it again
        }
      } else if (k === "r" || k === "R") {
        setRepeat(!playerState().repeat);
      } else if (k === "s" || k === "S") {
        cycleSpeed();
      } else if (MODE_KEYS[k] && !document.querySelector(".guided")) {
        chooseMode(MODE_KEYS[k]);
      } else if (k === "?") {
        e.preventDefault();
        onHelp();
      } else if (k === "Escape") {
        setCurrent(null);
      }
    };
    const onClick = (e: MouseEvent) => {
      const row = (e.target as HTMLElement).closest<HTMLElement>("[data-row]");
      if (row && current && row !== current) setCurrent(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
      current?.classList.remove("kb-current");
    };
  }, [onHelp]);
}

const KEYS: [string, string][] = [
  ["J / ↓", "Next line"],
  ["K / ↑", "Previous line"],
  ["Space", "Play the line"],
  ["Enter", "Show or hide the line"],
  ["R", "Repeat on / off"],
  ["S", "Change speed"],
  ["1 – 4", "Show all · Hide French · Hide English · Listen first"],
  ["?", "These shortcuts"],
];

export function ShortcutsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Keyboard shortcuts">
      <dl className="keys">
        {KEYS.map(([k, v]) => (
          <div key={k}>
            <dt>
              <kbd>{k}</kbd>
            </dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </Sheet>
  );
}
