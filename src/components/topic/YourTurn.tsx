"use client";
// "Your turn": the learner writes one sentence of their own; the AI gives short, kind feedback.
// No scores, no counts.

import Link from "next/link";
import { useId, useState } from "react";
import type { FeedbackOut, Sentence } from "@/lib/content/schema";
import { api, Fr, Rich } from "../ui";
import { Icon } from "../Icon";
import { useStudy } from "./context";
import { diffWords } from "./bits";
import { Play } from "./Play";

type Result = { attempt: string; feedback: FeedbackOut; saved: boolean };

export function YourTurn({
  sectionId,
  core,
  phrase,
  placeholder,
  onSaved,
}: {
  sectionId: string | null;
  core?: string;
  phrase?: string;
  placeholder?: string;
  onSaved?: (line: Sentence) => void;
}) {
  const { topicId, hasLlm } = useStudy();
  const id = useId();
  const [text, setText] = useState("");
  const [save, setSave] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const submit = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ feedback: FeedbackOut; line: Sentence | null }>(`/api/topics/${topicId}/attempt`, { json: { sectionId, text: t, save: save && Boolean(sectionId) } });
      setResult({ attempt: t, feedback: r.feedback, saved: Boolean(r.line) });
      if (r.line) onSaved?.(r.line);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setResult(null);
    setText("");
  };

  return (
    <div className="your-turn" role="group" aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`} className="yt-title">
        <Icon name="pen" size={18} /> Your turn
      </h3>
      <p className="yt-prompt">
        Say one thing about <em>your</em> situation
        {core || phrase ? " with " : "."}
        {core && (
          <>
            <span className="star" aria-hidden="true">
              ★
            </span>{" "}
            <span className="fr-inline" lang="fr">
              <Fr text={core} />
            </span>
          </>
        )}
        {core && phrase && " or "}
        {phrase && (
          <span className="fr-inline" lang="fr">
            <Fr text={phrase} />
          </span>
        )}
        {(core || phrase) && !/[.!?…]$/.test((phrase ?? core ?? "").trim()) && "."}
      </p>

      {!hasLlm ? (
        <p className="hint m-0">
          <Link href="/settings#ai">Connect an AI service in Settings</Link> to get feedback on your own sentences.
        </p>
      ) : result ? (
        <Feedback result={result} onAgain={reset} />
      ) : (
        <form
          className="stack-sm"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label className="visually-hidden" htmlFor={`${id}-t`}>
            Your sentence in French
          </label>
          <textarea
            id={`${id}-t`}
            className="yt-input"
            lang="fr"
            rows={2}
            maxLength={400}
            value={text}
            placeholder={placeholder ?? "Write one sentence in French…"}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void submit();
              }
            }}
          />
          <p className="hint m-0">Tip: tap the microphone on your keyboard to say it instead of typing.</p>
          {error && (
            <div className="error-box" role="alert">
              <p>{error}</p>
            </div>
          )}
          <div className="spread">
            {sectionId ? (
              <label className="checkbox small">
                <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} />
                <span>Save this sentence to the topic</span>
              </label>
            ) : (
              <span />
            )}
            <button type="submit" className="btn btn-primary" disabled={!text.trim() || busy}>
              {busy ? <span className="spinner" aria-hidden="true" /> : <Icon name="check" size={18} />}
              {busy ? "Checking…" : "Check my sentence"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Feedback({ result, onAgain }: { result: Result; onAgain: () => void }) {
  const f = result.feedback;
  const same = f.fixed.trim() === result.attempt.trim();
  const words = diffWords(result.attempt, f.fixed);
  return (
    <div className="yt-result stack-sm" role="status">
      {f.ok && <p className="yt-ok m-0">Good — that works.</p>}
      {!same && (
        <p className="yt-yours m-0">
          <span className="muted small">You wrote: </span>
          <span lang="fr">{result.attempt}</span>
        </p>
      )}
      <div className="yt-fixed">
        <Play text={f.fixed} />
        <div>
          <p className="fr m-0" lang="fr">
            {words.map((w, i) => (
              <span key={i}>
                {i > 0 && " "}
                {w.changed && !same ? <mark className="chg">{w.word}</mark> : w.word}
              </span>
            ))}
          </p>
          <p className="en m-0">{f.en}</p>
        </div>
      </div>
      {f.note && (
        <p className="note m-0">
          <Rich text={f.note} />
        </p>
      )}
      {f.natural && f.natural.trim() !== f.fixed.trim() && (
        <div className="yt-natural">
          <span className="muted small">A native might say…</span>
          <div className="yt-fixed">
            <Play text={f.natural} small />
            <span className="fr-inline" lang="fr">
              <Fr text={f.natural} />
            </span>
          </div>
        </div>
      )}
      <div className="spread">
        <span className="hint">{result.saved ? "Saved to this section, and to your Review." : ""}</span>
        <button type="button" className="btn btn-small" onClick={onAgain}>
          Try another
        </button>
      </div>
    </div>
  );
}
