"use client";
// One review card: the front asks (cloze, meaning, French, listen, or build the sentence), the back shows
// the French with its gender, IPA and pronunciation hint. Grading only decides when the card comes back.

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { speak, stop, usePlayer } from "../player";
import { Fr, PlayButton, Rich, Zh } from "../ui";
import { Icon } from "../Icon";
import { dictationDiff, type Card, type Face, type Result } from "./cards";

const KIND_LABEL: Record<Card["kind"], string> = {
  word: "Word",
  phrase: "Phrase",
  sentence: "Sentence",
  mine: "Your sentence",
  story: "My story",
  dialogue: "Dialogue",
  them: "What you hear",
};

const ASK: Record<Face, string> = {
  cloze: "Fill the gap",
  meaning: "Say it in French",
  french: "What does it mean?",
  listen: "Listen. What does it mean?",
  build: "Build the sentence",
};

type Props = {
  card: Card;
  face: Face;
  /** Graded cards show Not yet · Got it; practice cards only Next. */
  graded: boolean;
  autoplay: boolean;
  focusOnMount: boolean;
  onResult: (r: Result) => void;
};

export function ReviewCard({ card, face, graded, autoplay, focusOnMount, onResult }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [placed, setPlaced] = useState<number[]>([]);
  const [shake, setShake] = useState<number | null>(null);
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState("");
  const ref = useRef<HTMLElement>(null);
  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  const shakeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const isWord = card.kind === "word" || card.kind === "phrase";
  const playText = face === "cloze" && card.example ? card.example.fr : card.fr;

  const reveal = () => {
    if (revealed) return;
    setRevealed(true);
    if (autoplay && face !== "listen") void speak(playText);
  };

  // Listen-first cards play as soon as they appear.
  useEffect(() => {
    if (face === "listen") void speak(card.fr);
    if (focusOnMount) ref.current?.focus({ preventScroll: true });
    return () => clearTimeout(shakeTimer.current);
  }, [face, card.fr, focusOnMount]);

  // Keyboard on desktop: Space shows the answer, 1 = Not yet, 2 = Got it, → = skip / next.
  useEffect(() => {
    keys.current = (e) => {
      const el = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || el?.closest("input, textarea, select, [role=dialog]")) return;
      if (e.key === " ") {
        e.preventDefault();
        reveal();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onResult(graded ? "skip" : "got");
      } else if (graded && revealed && e.key === "1") onResult("again");
      else if (graded && revealed && e.key === "2") onResult("got");
      else if (!graded && revealed && e.key === "Enter" && el?.tagName !== "BUTTON" && el?.tagName !== "A") onResult("got");
    };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keys.current(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const tapTile = (i: number) => {
    if (!card.tiles) return;
    const want = card.tiles[placed.length];
    if (card.tiles[i] === want) {
      const next = [...placed, i];
      setPlaced(next);
      if (next.length === card.tiles.length) reveal();
    } else {
      setShake(i);
      clearTimeout(shakeTimer.current);
      shakeTimer.current = setTimeout(() => setShake(null), 450);
    }
  };

  const meaningOnFront = face === "meaning" || face === "build" || face === "cloze";
  const diff = revealed && typed.trim() ? dictationDiff(card.fr, typed) : null;

  return (
    <article className={`review-card card${revealed ? " is-revealed" : ""}`} ref={ref} tabIndex={-1} aria-label={`${KIND_LABEL[card.kind]}: ${ASK[face]}`}>
      <div className="rc-top">
        <span className="eyebrow m-0">{ASK[face]}</span>
        <span className="rc-kind">{KIND_LABEL[card.kind]}</span>
      </div>

      {/* ---------- front ---------- */}
      <div className="rc-front">
        {face === "cloze" && card.cloze && (
          <>
            <p className="rc-sentence fr" lang="fr">
              <Fr text={card.cloze.before} />
              {revealed ? (
                <mark className="rc-hit">
                  <Fr text={card.cloze.answer} />
                </mark>
              ) : (
                <Blank answer={card.cloze.answer} />
              )}
              <Fr text={card.cloze.after} />
            </p>
            <div className="rc-gloss">
              <span className="en">{card.en}</span>
              <Zh text={card.zh} />
            </div>
            {card.example && card.example.en && <p className="rc-sub">“{card.example.en}”</p>}
          </>
        )}

        {face === "meaning" && (
          <div className="rc-prompt">
            <p className="rc-meaning">{card.en}</p>
            <Zh text={card.zh} className="zh rc-zh" />
          </div>
        )}

        {face === "french" && (
          <div className="rc-prompt">
            <p className="rc-fr fr" lang="fr">
              <Fr text={card.fr} />
              {card.gender && <GenderChip g={card.gender} />}
            </p>
            <PlayButton text={card.fr} />
          </div>
        )}

        {face === "listen" && (
          <div className="rc-prompt">
            <ListenButton text={card.fr} />
            {!revealed &&
              (typing ? (
                <label className="field rc-type">
                  <span className="visually-hidden">Type what you hear</span>
                  <input
                    type="text"
                    lang="fr"
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), reveal())}
                    placeholder="Type what you hear"
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    autoFocus
                  />
                </label>
              ) : (
                <button type="button" className="btn btn-ghost btn-small" onClick={() => setTyping(true)}>
                  <Icon name="pen" size={16} /> Type what you hear
                </button>
              ))}
          </div>
        )}

        {face === "build" && card.tiles && card.order && (
          <div className="rc-build">
            <p className="rc-meaning small-meaning">{card.en}</p>
            <Zh text={card.zh} className="zh rc-zh" />
            <p className="build-line fr" lang="fr" aria-live="polite">
              {placed.length ? placed.map((i) => <span key={i} className="tile placed">{card.tiles![i]}</span>) : <span className="build-hint">Tap the pieces in order</span>}
            </p>
            {!revealed && (
              <div className="tiles" role="group" aria-label="Pieces of the sentence">
                {card.order.map((i) =>
                  placed.includes(i) ? null : (
                    <button key={i} type="button" lang="fr" className={`tile${shake === i ? " shake" : ""}`} onClick={() => tapTile(i)}>
                      {card.tiles![i]}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        )}

        {!revealed && isWord && card.wordType === "noun" && card.gender && face !== "french" && <GenderCheck gender={card.gender} />}
      </div>

      {/* ---------- back ---------- */}
      {revealed && (
        <div className="rc-back">
          <div className="rc-answer">
            <p className="rc-fr fr" lang="fr">
              <Fr text={card.fr} />
              {card.gender && <GenderChip g={card.gender} />}
            </p>
            <PlayButton text={card.fr} />
          </div>
          {card.ipa && <p className="ipa m-0">{card.ipa}</p>}
          {card.say && (
            <p className="rc-say">
              <Icon name="speaker" size={16} />
              <span>
                <Rich text={card.say} />
              </span>
            </p>
          )}
          {!meaningOnFront && (
            <div className="rc-gloss">
              <span className="en">{card.en}</span>
              <Zh text={card.zh} />
            </div>
          )}
          {card.forms && <p className="rc-forms fr-inline">{card.forms}</p>}
          {diff && <Dictation diff={diff} />}
          {isWord && card.example && face !== "cloze" && (
            <div className="rc-example">
              <PlayButton small text={card.example.fr} />
              <div>
                <div className="fr-inline" lang="fr">
                  <Fr text={card.example.fr} />
                </div>
                <div className="en small">{card.example.en}</div>
              </div>
            </div>
          )}
          <p className="rc-from">
            From{" "}
            <Link href={`/topics/${card.topicId}`}>
              <Fr text={card.topicTitleFr} />
            </Link>
          </p>
        </div>
      )}

      {/* ---------- actions ---------- */}
      <div className="rc-actions">
        {!revealed ? (
          <>
            <button type="button" className="btn btn-primary btn-large btn-block" onClick={reveal}>
              {face === "build" ? "Show the sentence" : face === "listen" && typing && typed.trim() ? "Check" : "Show answer"}
              <kbd aria-hidden="true">Space</kbd>
            </button>
          </>
        ) : graded ? (
          <div className="grade">
            <button type="button" className="btn btn-large grade-again" onClick={() => onResult("again")}>
              Not yet <kbd aria-hidden="true">1</kbd>
            </button>
            <button type="button" className="btn btn-large grade-got" onClick={() => onResult("got")}>
              <Icon name="check" size={18} /> Got it <kbd aria-hidden="true">2</kbd>
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-primary btn-large btn-block" onClick={() => onResult("got")}>
            Next <Icon name="arrow-right" size={18} />
          </button>
        )}
        {graded && (
          <button
            type="button"
            className="btn btn-ghost btn-small rc-skip"
            onClick={() => {
              stop();
              onResult("skip");
            }}
          >
            Skip <kbd aria-hidden="true">→</kbd>
          </button>
        )}
      </div>
    </article>
  );
}

function GenderChip({ g }: { g: "m" | "f" }) {
  return (
    <span className={`g g-${g}`} title={g === "m" ? "masculine" : "feminine"}>
      {g}.
    </span>
  );
}

/** The gap in a cloze: the first letter, then a line about as long as the word. */
function Blank({ answer }: { answer: string }) {
  const first = answer.trim()[0] ?? "";
  const rest = Math.min(Math.max(answer.length - 1, 2), 14);
  return (
    <span className="rc-blank" style={{ "--n": rest } as CSSProperties}>
      <span aria-hidden="true">{first}</span>
      <span className="visually-hidden">(missing word, starts with {first})</span>
    </span>
  );
}

function ListenButton({ text }: { text: string }) {
  const { playing } = usePlayer();
  const active = playing === text;
  return (
    <button type="button" className={`listen-big${active ? " busy" : ""}`} onClick={() => void speak(text)} aria-label={active ? "Stop" : "Play the French again"}>
      <Icon name={active ? "stop" : "speaker"} size={34} />
    </button>
  );
}

/** "le or la?" before the answer: gentle colour feedback, nothing counted. */
function GenderCheck({ gender }: { gender: "m" | "f" }) {
  const [pick, setPick] = useState<"m" | "f" | null>(null);
  return (
    <div className="gender-check">
      <span className="small muted">le or la?</span>
      <div className="row">
        {(["m", "f"] as const).map((g) => (
          <button
            key={g}
            type="button"
            className={`gc-btn g-${g}${pick && g === gender ? " right" : ""}${pick === g && g !== gender ? " wrong" : ""}`}
            aria-pressed={pick === g}
            disabled={pick !== null}
            onClick={() => setPick(g)}
          >
            {g === "m" ? "le" : "la"}
          </button>
        ))}
      </div>
      <span className="small" aria-live="polite">
        {pick && (pick === gender ? "Oui ! " : "Not quite: ") + (gender === "m" ? "masculine (le, un)" : "feminine (la, une)")}
      </span>
    </div>
  );
}

function Dictation({ diff }: { diff: ReturnType<typeof dictationDiff> }) {
  return (
    <div className="dictation">
      <p className="small m-0">
        {diff.exact ? "Exactly right." : diff.accentsOnly ? "Only the accents differ: look at the marked letters." : "The marked letters are the ones you missed."}
      </p>
      {!diff.exact && (
        <p className="dictation-line fr-inline m-0" lang="fr">
          {diff.chars.map((c, i) => (
            <span key={i} className={c.status === "ok" ? undefined : `d-${c.status}`}>
              {c.ch}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
