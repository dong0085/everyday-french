"use client";
// 20 random lines from the whole library, one at a time. No scores, nothing tracked.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { addClips, speak, stop } from "./player";
import { Fr, PlayButton } from "./ui";

export type Card = { fr: string; en: string; zh: string | null; kind: "word" | "phrase" | "sentence"; gender: "m" | "f" | null; topicId: string; topicTitleFr: string };
type Side = "fr" | "en" | "listen";

export function ReviewDeck({ cards, clips }: { cards: Card[]; clips: Record<string, string> }) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  const [side, setSide] = useState<Side>("en");
  useEffect(() => {
    addClips(clips);
    return () => stop();
  }, [clips]);
  const c = cards[i];
  useEffect(() => {
    if (c && side === "listen") void speak(c.fr);
  }, [i, side, c]);

  if (!cards.length)
    return (
      <main className="page">
        <h1>Review</h1>
        <p className="empty">Nothing to review yet. Make a topic first.</p>
      </main>
    );

  const go = (n: number) => {
    stop();
    setShown(false);
    setI(n);
  };
  const showFr = side === "fr" || shown;
  const showEn = side === "en" || shown;

  return (
    <main className="page">
      <h1>Review</h1>
      <p className="sub">20 random lines from all your topics. Say it, then tap to check. Nothing is scored.</p>
      <div className="seg" role="group" aria-label="Show first" style={{ marginTop: 12 }}>
        {(
          [
            ["en", "Meaning first"],
            ["fr", "French first"],
            ["listen", "Listen first"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" aria-pressed={side === k} onClick={() => (setSide(k), setShown(false))}>
            {label}
          </button>
        ))}
      </div>

      <div className="deck">
        <div className="card deck-card" onClick={() => setShown((s) => !s)} role="button" tabIndex={0} onKeyDown={(e) => (e.key === " " || e.key === "Enter") && setShown((s) => !s)} aria-label="Card: tap to show the answer">
          <span className="from">
            {i + 1} / {cards.length} · {c.kind}
          </span>
          <div className="fr" lang="fr" style={{ filter: showFr ? "none" : "blur(9px)" }}>
            <Fr text={c.fr} /> {c.gender && showFr && <span className={`g g-${c.gender}`}>{c.gender}.</span>}
          </div>
          <div className="en" style={{ filter: showEn ? "none" : "blur(9px)" }}>
            {c.en}
          </div>
          {c.zh && showEn && <div className="zh">{c.zh}</div>}
          {!shown && <span className="hint">Tap to show</span>}
        </div>
        <div className="row" style={{ justifyContent: "center" }}>
          <button className="btn" onClick={() => go(Math.max(0, i - 1))} disabled={i === 0}>
            ← Back
          </button>
          <PlayButton text={c.fr} />
          {i < cards.length - 1 ? (
            <button className="btn btn-primary" onClick={() => go(i + 1)}>
              Next →
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => (go(0), router.refresh())}>
              New shuffle ↻
            </button>
          )}
        </div>
        <p className="meta" style={{ textAlign: "center" }}>
          From <Link href={`/topics/${c.topicId}`}><Fr text={c.topicTitleFr} /></Link>
        </p>
      </div>
    </main>
  );
}
