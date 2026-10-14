"use client";
// "Study this topic": a focused 10-minute pass in short steps.
// 1 Listen (My story, French hidden) → 2 Words (section by section, Listen first) → 3 Say it
// (sentences with a gap to repeat) → 4 Retell (My story, Hide French) → 5 Your turn → Done for today.
// It reuses the page's rows with its own mode and reveal scope. Exit any time.

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { FullTopic } from "@/lib/data";
import type { Sentence } from "@/lib/content/schema";
import { api, Fr, toast } from "../ui";
import { Icon } from "../Icon";
import { setRepeat, stop, usePlayerSelector, type Mode } from "../player";
import { StudyProvider, useStudy, type StudyContext } from "./context";
import { resetReveal } from "./useReveal";
import { groupWords, followAlong, revealLast } from "./SectionView";
import { WordItem } from "./WordItem";
import { LineItem } from "./LineItem";
import { StoryView } from "./StoryView";
import { PlayList } from "./Play";
import { YourTurn } from "./YourTurn";

type Step = { key: string; title: string; mode: Mode; body: ReactNode; lead: string };

export function GuidedStudy({
  topic,
  onClose,
  onStudied,
  onAppend,
}: {
  topic: FullTopic;
  onClose: () => void;
  onStudied: () => void;
  onAppend: (sectionId: string, line: Sentence) => void;
}) {
  const base = useStudy();
  const [i, setI] = useState(0);
  const [sec, setSec] = useState(0); // which section in the Words step
  const [ytSection, setYtSection] = useState(topic.sections[0]?.id ?? null);
  const [saving, setSaving] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const repeat = usePlayerSelector((s) => s.repeat);

  const sections = topic.sections.filter((s) => s.status === "ready");
  const story = topic.storyFr;
  const noop = () => {};

  const sentences = sections.flatMap((s) => s.data.sentences);
  const sentIds = sentences.map((s) => s.id);

  const steps: Step[] = [];
  if (story.length)
    steps.push({
      key: "listen",
      title: "Listen",
      mode: "hide-fr",
      lead: "Listen to your story in French. Read the English while you listen.",
      body: <StoryView lines={story} onSave={noop} intro="Just listen. The French is hidden for now." />,
    });
  if (sections.length) {
    const s = sections[Math.min(sec, sections.length - 1)];
    const g = groupWords(s.data.words);
    const words = [...g.key, ...g.phrases];
    const ids = words.map((w) => w.id);
    steps.push({
      key: "words",
      title: "Words",
      mode: "listen",
      lead: "Tap Listen, say what you heard, then tap Show.",
      body: (
        <section className="topic-section">
          <p className="eyebrow m-0">
            Part {Math.min(sec, sections.length - 1) + 1} of {sections.length}
          </p>
          <h2 lang="fr" className="mt-2">
            <Fr text={s.titleFr} />
          </h2>
          <p className="sub">{s.title}</p>
          <div className="section-play">
            <PlayList id={`g:words:${s.id}`} lines={words.map((w) => w.fr)} onLine={followAlong("g", ids, "listen")} options={{ title: s.titleFr, gaps: true, onDone: revealLast("g", ids, "listen") }}>
              Play them all
            </PlayList>
          </div>
          <ul className="list mt-4">
            {words.map((w) => (
              <WordItem key={w.id} word={w} onChange={noop} />
            ))}
          </ul>
        </section>
      ),
    });
  }
  if (sentences.length)
    steps.push({
      key: "say",
      title: "Say it",
      mode: "all",
      lead: "Listen, then say each sentence in the gap. Repeat plays it normal, slow, normal.",
      body: (
        <section className="topic-section">
          <div className="section-play">
            <PlayList id="g:say" className="btn btn-primary" lines={sentences.map((s) => s.fr)} onLine={followAlong("g", sentIds, "all")} options={{ title: topic.titleFr, gaps: true }}>
              Start
            </PlayList>
            <button type="button" className="toggle" aria-pressed={repeat} onClick={() => setRepeat(!repeat)}>
              <Icon name="repeat" size={18} /> Repeat
            </button>
          </div>
          <ul className="list">
            {sentences.map((s) => (
              <LineItem key={s.id} line={s} onChange={noop} />
            ))}
          </ul>
        </section>
      ),
    });
  if (story.length)
    steps.push({
      key: "retell",
      title: "Retell",
      mode: "hide-fr",
      lead: "Say each line in French from the English. Then tap Show French to check.",
      body: <StoryView lines={story} onSave={noop} intro="Your turn to tell it." />,
    });
  steps.push({
    key: "turn",
    title: "Your turn",
    mode: "all",
    lead: "Make one sentence of your own. It's the best way to remember.",
    body: (
      <section className="topic-section">
        {sections.length > 1 && (
          <div className="chips yt-pick" role="group" aria-label="Which part">
            {sections.map((s) => (
              <button key={s.id} type="button" aria-pressed={ytSection === s.id} onClick={() => setYtSection(s.id)}>
                <span lang="fr">
                  <Fr text={s.titleFr} />
                </span>
              </button>
            ))}
          </div>
        )}
        {(() => {
          const s = sections.find((x) => x.id === ytSection) ?? sections[0];
          const g = s ? groupWords(s.data.words) : null;
          return (
            <YourTurn
              key={s?.id ?? "none"}
              sectionId={s?.id ?? null}
              core={g?.key[0]?.fr}
              phrase={g?.phrases[0]?.fr}
              onSaved={(line) => s && onAppend(s.id, line)}
            />
          );
        })()}
      </section>
    ),
  });

  const step = steps[Math.min(i, steps.length - 1)];
  const last = i >= steps.length - 1;
  const inWords = step.key === "words" && sec < sections.length - 1;

  const go = (next: number, nextSec = 0) => {
    stop();
    resetReveal();
    setI(next);
    setSec(nextSec);
    panel.current?.scrollTo({ top: 0 });
  };

  const close = () => {
    stop();
    resetReveal();
    onClose();
  };

  const finish = async () => {
    setSaving(true);
    try {
      await api(`/api/topics/${topic.id}`, { method: "PATCH", json: { studied: true } });
    } catch {
      // Nothing to lose: the study itself happened. The "studied" mark just won't show.
    }
    setSaving(false);
    onStudied();
    toast("Bien joué ! Done for today.");
    close();
  };

  // Escape leaves; the page behind does not scroll.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector(".sheet-backdrop")) {
        stop();
        resetReveal();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const ctx: StudyContext = { ...base, mode: step.mode, scope: "g", editing: false };

  return (
    <div className="guided" role="dialog" aria-modal="true" aria-labelledby="guided-title">
      <div className="guided-head">
        <div className="guided-inner">
          <button type="button" className="icon-btn plain" onClick={close} aria-label="Exit study">
            <Icon name="close" />
          </button>
          <div className="grow">
            <p className="eyebrow m-0" id="guided-title">
              Step {i + 1} of {steps.length} · {step.title}
            </p>
            <ol className="steps-dots" aria-hidden="true">
              {steps.map((s, k) => (
                <li key={s.key} data-state={k < i ? "done" : k === i ? "current" : "todo"} />
              ))}
            </ol>
          </div>
        </div>
      </div>
      <div className="guided-body" ref={panel} tabIndex={-1}>
        <div className="guided-inner">
          <p className="guided-lead">{step.lead}</p>
          <StudyProvider value={ctx}>{step.body}</StudyProvider>
        </div>
      </div>
      <div className="guided-foot">
        <div className="guided-inner">
          <button type="button" className="btn btn-ghost" disabled={i === 0 && sec === 0} onClick={() => (step.key === "words" && sec > 0 ? go(i, sec - 1) : go(i - 1, steps[i - 1]?.key === "words" ? sections.length - 1 : 0))}>
            <Icon name="arrow-left" size={18} /> Back
          </button>
          {last ? (
            <button type="button" className="btn btn-primary" onClick={finish} disabled={saving}>
              <Icon name="check" size={18} /> Done for today
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => (inWords ? go(i, sec + 1) : go(i + 1))}>
              {inWords ? "Next part" : "Next"} <Icon name="arrow-right" size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
