"use client";
// The waiting screen while a topic is written, and the "C'est prêt !" banner when it is done.
// Mounted by the topic page (TopicView). Shows the job's real steps, a bar, elapsed time and the
// learner's own story, so the wait feels personal and honest.

import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { Fr, Spinner } from "./ui";

type Props = {
  stage: string;
  sections: { status: string }[];
  genStartedAt: string | null;
  sourceText: string;
  titleFr: string;
};

const ORDER = ["outline", "sections", "story", "dialogue", "check", "done"];

/** Rough share of the work done at each stage (sections fill 10 → 65 as they finish). */
function percent(stage: string, done: number, total: number): number {
  switch (stage) {
    case "outline":
      return 8;
    case "sections":
      return Math.round(10 + 55 * (total ? done / total : 0));
    case "story":
      return 70;
    case "dialogue":
      return 80;
    case "check":
      return 92;
    case "done":
      return 100;
    default:
      return 5;
  }
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function GenerationProgress({ stage, sections, genStartedAt, sourceText, titleFr }: Props) {
  const [elapsed, setElapsed] = useState<number | null>(null);

  // Elapsed time, updated from a timer (never computed during render).
  useEffect(() => {
    const start = genStartedAt ? new Date(genStartedAt).getTime() : Date.now();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [genStartedAt]);

  // The tab says it is still working, for someone who switched away.
  useEffect(() => {
    const before = document.title;
    document.title = "Writing… · Everyday French";
    return () => {
      document.title = before;
    };
  }, []);

  const at = Math.max(0, ORDER.indexOf(stage));
  const total = sections.length;
  const done = sections.filter((s) => s.status === "ready").length;
  const pct = percent(stage, done, total);
  const steps: { label: string; extra?: string }[] = [
    { label: "Reading your story" },
    { label: "Planning" },
    { label: "Words and sentences", extra: total && at >= 1 ? `${Math.min(done, total)} of ${total}` : undefined },
    { label: "Your story in French" },
    { label: "Writing the dialogue" },
    { label: "Checking the French" },
  ];
  // Step 0 is always done; step i (1–5) matches ORDER[i - 1].
  const state = (i: number) => (i === 0 || i - 1 < at ? "done" : i - 1 === at ? "current" : "todo");
  const quote = sourceText.trim().replace(/\s+/g, " ");

  return (
    <section className="gen" aria-labelledby="gen-h">
      {!titleFr && (
        <div className="gen-head">
          <h1 id="gen-h" lang="fr">
            On écrit ton sujet…
          </h1>
          <p className="sub">Writing your topic</p>
        </div>
      )}
      {titleFr && (
        <h2 id="gen-h" className="visually-hidden">
          Writing your topic
        </h2>
      )}
      <div className="card gen-card" role="status" aria-live="polite">
        <ol className="stepper">
          {steps.map((s, i) => {
            const st = state(i);
            return (
              <li key={s.label} className="step" data-state={st} aria-current={st === "current" ? "step" : undefined}>
                <span className="step-mark" aria-hidden="true">
                  {st === "done" ? <Icon name="check" size={14} /> : st === "current" ? <Spinner /> : null}
                </span>
                <span className="step-label">
                  {s.label}
                  {s.extra && <span className="step-extra"> ({s.extra})</span>}
                  {st === "done" && <span className="visually-hidden"> — done</span>}
                </span>
              </li>
            );
          })}
        </ol>
        <div className="progress" aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="gen-time m-0">
          Usually about a minute{elapsed !== null && <span className="nowrap"> · {clock(elapsed)}</span>}
        </p>
        <p className="hint m-0">You can leave this page or lock your phone. We&apos;ll keep going.</p>
      </div>
      {quote && (
        <figure className="gen-quote">
          <figcaption className="eyebrow">Your story</figcaption>
          <blockquote>
            “{quote.length > 160 ? `${quote.slice(0, 160).trimEnd()}…` : quote}”
          </blockquote>
        </figure>
      )}
    </section>
  );
}

/** Shown once when a topic the learner watched being written becomes ready. */
export function ReadyBanner({ titleFr, onDismiss }: { titleFr: string; onDismiss?: () => void }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const before = document.title;
    document.title = `✓ ${titleFr || "Ready"} · Everyday French`;
    // Only after a tap on the page: otherwise browsers block it and log an error.
    try {
      if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(30);
    } catch {}
    window.scrollTo({ top: 0, behavior: "smooth" });
    return () => {
      document.title = before;
    };
  }, [titleFr]);

  if (!open) return null;
  return (
    <div className="callout ok ready-banner fade-in" role="status">
      <p>
        <Icon name="check" size={18} className="inline-icon" /> <strong lang="fr">
          <Fr text="C'est prêt !" />
        </strong> Your topic is ready.
      </p>
      <button
        type="button"
        className="icon-btn small plain"
        aria-label="Dismiss"
        onClick={() => {
          setOpen(false);
          onDismiss?.();
        }}
      >
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}
