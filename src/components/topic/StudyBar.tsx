"use client";
// The study controls that stay on screen: section chips (with scroll spy) and one compact bar.
// Phones: the bar is fixed at the bottom, in thumb reach (the app's tab bar hides on this page, see topic.css).
// Desktop: the chips and the bar stick under the header.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Sheet, Switch, toast } from "../ui";
import { Icon, type IconName } from "../Icon";
import { cycleSpeed, playAll, setIpa, setMode, setRecord, setRepeat, SPEED_LABEL, stop, usePlayer, type Mode } from "../player";
import { resetReveal, revealAll, useAllShown } from "./useReveal";
import { followAlong } from "./SectionView";

export type Chip = {
  id: string;
  num: ReactNode;
  label: string;
  lang?: "fr";
  lines: string[];
  ids: string[];
};

export const MODES: {
  mode: Mode;
  label: string;
  short: string;
  icon: IconName;
  hint: string;
}[] = [
  {
    mode: "all",
    label: "Show all",
    short: "Show all",
    icon: "eye",
    hint: "French and meaning both show. Read and listen.",
  },
  {
    mode: "hide-fr",
    label: "Hide French",
    short: "Hide FR",
    icon: "eye-off",
    hint: "Tap a row to show the French. Try saying it first.",
  },
  {
    mode: "hide-en",
    label: "Hide English",
    short: "Hide EN",
    icon: "eye-off",
    hint: "Tap a row to show the meaning.",
  },
  {
    mode: "listen",
    label: "Listen first",
    short: "Listen",
    icon: "headphones",
    hint: "Tap Listen, say what you heard, then tap Show.",
  },
];

/** Changes the quiz mode: every row starts hidden again. Shows a one-line hint the first time. */
export function chooseMode(m: Mode) {
  setMode(m);
  resetReveal();
  if (m === "all") return;
  try {
    if (localStorage.getItem("ef.hint." + m)) return;
    localStorage.setItem("ef.hint." + m, "1");
  } catch {
    return;
  }
  toast(MODES.find((x) => x.mode === m)!.hint);
}

export function StudyBar({
  chips,
  editing,
  onDoneEditing,
  onShortcuts,
}: {
  chips: Chip[];
  editing: boolean;
  onDoneEditing: () => void;
  onShortcuts: () => void;
}) {
  const p = usePlayer();
  const allShown = useAllShown();
  const [current, setCurrent] = useState<string | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const chipRow = useRef<HTMLElement>(null);
  const chipKey = chips.map((c) => c.id).join("|");

  // Scroll spy: the chip of the section in view is marked and kept visible in the chip row.
  useEffect(() => {
    const els = chipKey
      .split("|")
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!hit) return;
        const id = hit.target.id;
        setCurrent(id);
        const row = chipRow.current;
        const chip = row?.querySelector<HTMLElement>(`[data-chip="${CSS.escape(id)}"]`);
        if (row && chip) row.scrollTo({ left: chip.offsetLeft - 16, behavior: "smooth" });
      },
      { rootMargin: "-35% 0px -60% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [chipKey]);

  const busy = Boolean(p.playing || p.list || p.gap || p.mine);
  const here = chips.find((c) => c.id === current) ?? chips[0];
  const quiz = p.mode !== "all";
  const modeInfo = MODES.find((m) => m.mode === p.mode)!;
  const showText = p.mode === "all" || p.mode === "hide-en";

  const toggleRecord = async (on: boolean) => {
    const ok = await setRecord(on);
    if (!ok)
      toast("Couldn't use the microphone. Check that this site may use it.", {
        tone: "error",
      });
  };

  return (
    <>
      <div className="study-dock">
        {chips.length > 0 && (
          <nav className="chips study-chips" aria-label="Sections" ref={chipRow}>
            {chips.map((c) => (
              <a key={c.id} href={`#${c.id}`} data-chip={c.id} aria-current={current === c.id ? "true" : undefined}>
                <span className="n" aria-hidden="true">
                  {c.num}
                </span>
                <span lang={c.lang}>{c.label}</span>
              </a>
            ))}
          </nav>
        )}

        {editing && (
          <div className="editing-bar" role="status">
            <Icon name="edit" size={18} />
            <span className="grow">Editing — change or delete any line.</span>
            <button type="button" className="btn btn-small btn-primary" onClick={onDoneEditing}>
              Done
            </button>
          </div>
        )}

        <div className="study-bar" role="toolbar" aria-label="Study controls">
          {(p.playing || p.gap || p.mine) && (
            <div className="now-playing" aria-live="off">
              {p.gap ? (
                <>
                  <span className="np-label">
                    {p.gap.rec && <span className="rec-dot" aria-hidden="true" />}
                    {p.gap.rec ? "Your turn — recording" : "Your turn — say it"}
                  </span>
                  <span className="gap-bar" aria-hidden="true">
                    <span key={p.gap.id} style={{ animationDuration: `${p.gap.ms}ms` }} />
                  </span>
                </>
              ) : p.mine ? (
                <span className="np-label">
                  <Icon name="mic" size={14} /> Your voice
                </span>
              ) : (
                <>
                  <span className="np-text" lang={showText ? "fr" : undefined}>
                    {showText ? p.playing : "Playing…"}
                  </span>
                  {p.fallback === p.playing && <span className="np-note">Recording didn&apos;t load — device voice</span>}
                </>
              )}
            </div>
          )}

          <button
            type="button"
            className="sb-btn"
            onClick={() => setOptionsOpen(true)}
            aria-label={`Study mode: ${modeInfo.label}. Change`}
            aria-haspopup="dialog"
          >
            <Icon name={modeInfo.icon} size={20} />
            <span className="sb-label">{modeInfo.short}</span>
            <Icon name="chevron-down" size={14} className="sb-chev" />
          </button>
          <button type="button" className="sb-btn" onClick={cycleSpeed} aria-label={`Speed ${SPEED_LABEL[p.speed]}. Change`} title="Speed (S)">
            <span className="sb-speed">{SPEED_LABEL[p.speed]}</span>
            <span className="sb-label">Speed</span>
          </button>
          <button
            type="button"
            className="sb-btn"
            aria-pressed={p.repeat}
            onClick={() => setRepeat(!p.repeat)}
            title="Repeat: normal, slow, normal, with time to say it (R)"
          >
            <Icon name="repeat" size={20} />
            <span className="sb-label">Repeat</span>
          </button>
          <button
            type="button"
            className="sb-btn"
            disabled={!quiz}
            onClick={() => revealAll(!allShown)}
            title={quiz ? undefined : "Choose a quiz mode to hide lines"}
            aria-label={allShown ? "Hide all" : "Reveal all"}
          >
            <Icon name={allShown ? "eye-off" : "eye"} size={20} />
            <span className="sb-label">{allShown ? "Hide all" : "Reveal all"}</span>
          </button>
          <span className="sb-space" />
          <button type="button" className="icon-btn plain sb-keys" onClick={onShortcuts} aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)">
            ?
          </button>
          <button
            type="button"
            className={`sb-btn sb-play${busy ? " is-playing" : ""}`}
            disabled={!busy && !here?.lines.length}
            aria-label={busy ? "Stop" : `Play this part: ${here?.label ?? ""}`}
            onClick={() =>
              busy ? stop() : here && void playAll(here.lines, followAlong("page", here.ids, p.mode), { id: `bar:${here.id}`, title: here.label })
            }
          >
            <Icon name={busy ? "stop" : "play"} size={20} />
            <span className="sb-label">{busy ? "Stop" : "Play"}</span>
          </button>
        </div>
      </div>

      <Sheet open={optionsOpen} onClose={() => setOptionsOpen(false)} title="How to study">
        <div className="radio-list" role="group" aria-label="Study mode">
          {MODES.map((m) => (
            <button
              key={m.mode}
              type="button"
              aria-pressed={p.mode === m.mode}
              aria-label={m.label}
              aria-describedby={`mode-hint-${m.mode}`}
              onClick={() => {
                chooseMode(m.mode);
                setOptionsOpen(false);
              }}
            >
              <strong>{m.label}</strong>
              <small id={`mode-hint-${m.mode}`}>{m.hint}</small>
            </button>
          ))}
        </div>
        <div className="stack-sm mt-4 sheet-switches">
          <Switch checked={p.ipa} onChange={setIpa} label="Pronunciation (IPA)" hint="Shows how each word sounds, like /ɛ̃ kafe/." />
          <Switch
            checked={p.record}
            onChange={(v) => void toggleRecord(v)}
            label="Record & compare"
            hint="After each line, say it: you hear the model, then yourself. Stays on this device, never uploaded."
          />
        </div>
      </Sheet>
    </>
  );
}
