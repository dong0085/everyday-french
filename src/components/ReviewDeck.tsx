"use client";
// The review page: today's due cards (at most 20) one at a time, or a practice shuffle.
// Got it / Not yet only decide when a card comes back. No scores, no streaks.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { addClips, stop } from "./player";
import { api, Sheet, Switch, toastError } from "./ui";
import { Icon } from "./Icon";
import { ReviewCard } from "./review/ReviewCard";
import { localToday, type Card, type Face, type Result, type Side } from "./review/cards";
import { setAutoplay, setSide, useReviewPrefs } from "./review/prefs";

const SIDES: [Side, string, string][] = [
  ["auto", "Mixed", "Words in their sentence, your lines from the meaning, what you hear by ear."],
  ["meaning", "Meaning first", "See the meaning, say the French."],
  ["french", "French first", "See the French, say what it means."],
  ["listen", "Listen first", "Hear it, say what it means."],
];

function faceOf(card: Card, side: Side): Face {
  if (side === "auto") return card.face;
  return side;
}

/** Remembers the device's time zone in a cookie, so "today" on the server is the learner's today. */
function useTimeZoneCookie(serverToday: string) {
  const router = useRouter();
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!tz) return;
      const current = document.cookie
        .split("; ")
        .find((c) => c.startsWith("ef.tz="))
        ?.slice(6);
      if (current && decodeURIComponent(current) === tz) return;
      document.cookie = `ef.tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
      if (localToday() !== serverToday) router.refresh();
    } catch {
      // cookies blocked: the server uses UTC
    }
  }, [router, serverToday]);
}

export function ReviewDeck({
  cards,
  clips,
  practice,
  dueTotal,
  tomorrow,
  today,
}: {
  cards: Card[];
  clips: Record<string, string>;
  practice: boolean;
  dueTotal: number;
  tomorrow: number;
  today: string;
}) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [later, setLater] = useState(0);
  const [options, setOptions] = useState(false);
  const { side, autoplay } = useReviewPrefs();
  useTimeZoneCookie(today);
  useEffect(() => {
    addClips(clips);
    return () => stop();
  }, [clips]);

  if (!cards.length)
    return (
      <main className="page review-page">
        <h1>Practice</h1>
        <div className="review-empty card">
          <p className="m-0">Nothing to practise yet. Make a topic first.</p>
          <Link className="btn btn-primary self-start" href="/new">
            <Icon name="plus" size={18} /> Make a topic
          </Link>
        </div>
      </main>
    );

  const done = i >= cards.length;
  const card = cards[Math.min(i, cards.length - 1)];

  const answer = (r: Result) => {
    stop();
    if (!practice && card.id) {
      api("/api/review", { json: { id: card.id, result: r, today: localToday() } }).catch(toastError);
      if (r !== "got") setLater((n) => n + 1);
    }
    setI((n) => n + 1);
  };

  const more = !practice && dueTotal > cards.length;
  const comeBack = tomorrow + later + Math.max(0, dueTotal - cards.length);

  return (
    <main className="page review-page">
      <header className="review-head">
        <div className="grow">
          <h1>{practice ? "Practice" : "Review"}</h1>
          <p className="sub">
            {practice
              ? "20 random lines from all your topics. Say it, then check."
              : dueTotal > cards.length
                ? `${cards.length} now, the rest another day`
                : `${dueTotal} to review today`}
          </p>
        </div>
        <button type="button" className="btn btn-ghost btn-small" onClick={() => setOptions(true)}>
          <Icon name="settings" size={16} /> Options
        </button>
      </header>

      {!done && (
        <div className="review-progress">
          <div
            className="progress grow"
            role="progressbar"
            aria-label="Cards"
            aria-valuemin={0}
            aria-valuemax={cards.length}
            aria-valuenow={i + 1}
            aria-valuetext={`${i + 1} of ${cards.length}`}
          >
            <span style={{ width: `${(i / cards.length) * 100}%` }} />
          </div>
          <span className="small muted nowrap">
            {i + 1} of {cards.length}
          </span>
        </div>
      )}

      {done ? (
        <section className="review-done card fade-in" aria-live="polite">
          {practice ? (
            <>
              <h2>That&apos;s 20.</h2>
              <p className="m-0 muted">Encore ? Another 20 random lines are one tap away.</p>
              <div className="row">
                <button type="button" className="btn btn-primary" onClick={() => router.refresh()}>
                  <Icon name="repeat" size={18} /> New shuffle
                </button>
                <Link className="btn" href="/review">
                  Back to review
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="review-bye fr" lang="fr">
                À demain.
              </p>
              <h2>Done for today.</h2>
              {comeBack > 0 && (
                <p className="small muted m-0">
                  {comeBack} {comeBack === 1 ? "card comes" : "cards come"} back tomorrow.
                </p>
              )}
              <div className="row">
                <Link className="btn btn-primary" href="/words">
                  <Icon name="book" size={18} /> Your words
                </Link>
                <Link className="btn" href="/">
                  Home
                </Link>
                {more && (
                  <button type="button" className="btn btn-ghost" onClick={() => router.refresh()}>
                    Keep going
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      ) : (
        <ReviewCard
          key={card.key}
          card={card}
          face={faceOf(card, side)}
          graded={!practice && Boolean(card.id)}
          autoplay={autoplay}
          focusOnMount={i > 0}
          onResult={answer}
        />
      )}

      <p className="review-note small muted">
        {practice ? "Nothing is scored." : "Got it / Not yet only decides when you see it again. Nothing is scored."}
      </p>

      <Sheet open={options} onClose={() => setOptions(false)} title="Card options">
        <div className="stack">
          <div className="radio-list" role="group" aria-label="Show first">
            {SIDES.map(([k, label, hint]) => (
              <button key={k} type="button" aria-pressed={side === k} onClick={() => setSide(k)}>
                <strong>{label}</strong>
                <small>{hint}</small>
              </button>
            ))}
          </div>
          <Switch checked={autoplay} onChange={setAutoplay} label="Play the French when I show the answer" />
          <p className="hint m-0">On a keyboard: Space shows the answer, 1 = Not yet, 2 = Got it, → skips.</p>
        </div>
      </Sheet>
    </main>
  );
}

/** Nothing due: say so kindly, and offer a practice shuffle. */
export function ReviewEmpty({ hasItems, tomorrow, today }: { hasItems: boolean; tomorrow: number; today: string }) {
  useTimeZoneCookie(today);
  return (
    <main className="page review-page">
      <header className="review-head">
        <h1>Review</h1>
      </header>
      <section className="review-empty card fade-in">
        {hasItems ? (
          <>
            <p className="review-bye fr" lang="fr">
              À demain !
            </p>
            <h2>Nothing due today.</h2>
            {tomorrow > 0 && (
              <p className="small muted m-0">
                {tomorrow} {tomorrow === 1 ? "card comes" : "cards come"} back tomorrow.
              </p>
            )}
          </>
        ) : (
          <>
            <h2>Your review starts with your topics.</h2>
            <p className="m-0 muted">Make a topic, and its words and sentences come back here the next day, then a few days later, then less and less often.</p>
          </>
        )}
        <div className="row">
          {!hasItems && (
            <Link className="btn btn-primary" href="/new">
              <Icon name="plus" size={18} /> Make a topic
            </Link>
          )}
          <Link className={`btn ${hasItems ? "" : "btn-ghost"}`} href="/review?practice=1">
            <Icon name="cards" size={18} /> Practise anyway: 20 random lines
          </Link>
          {hasItems && (
            <Link className="btn btn-ghost" href="/words">
              Your words
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
