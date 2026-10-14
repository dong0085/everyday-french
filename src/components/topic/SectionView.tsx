"use client";
// One section: header with "Play words / Play sentences", Key words · Phrases · More words,
// sentences (Eux / Moi), tips, and "Your turn".

import { memo, useState } from "react";
import type { FullSection } from "@/lib/data";
import type { SectionData, Sentence, Word } from "@/lib/content/schema";
import { confirmDialog, Fr, Rich, Spinner } from "../ui";
import { Icon } from "../Icon";
import type { Mode } from "../player";
import { useStudy, rowKey } from "./context";
import { reveal } from "./useReveal";
import { WordItem } from "./WordItem";
import { LineItem } from "./LineItem";
import { PlayList } from "./Play";
import { YourTurn } from "./YourTurn";

/** Groups a section's words: core words, phrases, and the rest. */
export function groupWords(words: Word[]) {
  return {
    key: words.filter((w) => w.core && w.type !== "phrase"),
    phrases: [...words.filter((w) => w.type === "phrase")].sort((a, b) => Number(b.core) - Number(a.core)),
    more: words.filter((w) => !w.core && w.type !== "phrase"),
  };
}

/** Scrolls a row into the middle of the screen and, in quiz modes, shows the one that just played. */
export function followAlong(scope: string, ids: string[], mode: Mode) {
  return (i: number) => {
    if (i > 0 && (mode === "hide-fr" || mode === "listen")) reveal(rowKey(scope, ids[i - 1]));
    const el = document.querySelector(`[data-key="${CSS.escape(rowKey(scope, ids[i]))}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  };
}
export function revealLast(scope: string, ids: string[], mode: Mode) {
  return () => {
    if (ids.length && (mode === "hide-fr" || mode === "listen")) reveal(rowKey(scope, ids[ids.length - 1]));
  };
}

export const SectionView = memo(function SectionView({
  section,
  index,
  onSave,
  onAppend,
  onRegenerate,
  onRetry,
}: {
  section: FullSection;
  index: number;
  onSave: (sectionId: string, data: SectionData) => void;
  onAppend: (sectionId: string, line: Sentence) => void;
  onRegenerate: (sectionId: string, extra?: string) => Promise<void>;
  onRetry: () => void;
}) {
  const { editing, scope, mode } = useStudy();
  const [extra, setExtra] = useState("");
  const d = section.data;
  const busy = section.status === "pending" || section.status === "generating";
  const g = groupWords(d.words);
  const ordered = [...g.key, ...g.phrases, ...g.more];

  const setWord = (id: string, next: Word | null) =>
    onSave(section.id, { ...d, words: next ? d.words.map((w) => (w.id === id ? next : w)) : d.words.filter((w) => w.id !== id) });
  const setSentence = (id: string, next: Sentence | null) =>
    onSave(section.id, { ...d, sentences: next ? d.sentences.map((x) => (x.id === id ? next : x)) : d.sentences.filter((x) => x.id !== id) });

  const wordIds = ordered.map((w) => w.id);
  const sentIds = d.sentences.map((s) => s.id);
  const core = g.key[0]?.fr;
  const phrase = g.phrases[0];

  return (
    <section className="topic-section" id={section.slug} data-section={section.id} aria-labelledby={`h-${section.slug}`}>
      <header className="section-head">
        <span className="num" aria-hidden="true">
          {index + 1}
        </span>
        <div>
          <h2 lang="fr" id={`h-${section.slug}`}>
            <Fr text={section.titleFr} />
          </h2>
          <p className="sub">{section.title}</p>
        </div>
      </header>
      {section.intro && (
        <p className="intro">
          <Rich text={section.intro} />
        </p>
      )}

      {busy && (
        <div className="stack mt-4" role="status">
          <div className="status-line">
            <Spinner /> Writing this section…
          </div>
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      )}
      {section.status === "failed" && (
        <div className="error-box stack mt-4">
          <p>This section didn&apos;t finish. Nothing is lost — tap Retry.</p>
          {section.error && (
            <details>
              <summary>What happened?</summary>
              {section.error}
            </details>
          )}
          <div className="row">
            <button className="btn btn-small btn-primary" onClick={onRetry}>
              Retry
            </button>
          </div>
        </div>
      )}

      {!busy && (ordered.length > 0 || d.sentences.length > 0) && (
        <div className="section-play">
          <PlayList
            id={`sec:${section.id}:words`}
            lines={ordered.map((w) => w.fr)}
            onLine={followAlong(scope, wordIds, mode)}
            options={{ title: section.titleFr, onDone: revealLast(scope, wordIds, mode) }}
          >
            Play words
          </PlayList>
          <PlayList
            id={`sec:${section.id}:sentences`}
            lines={d.sentences.map((s) => s.fr)}
            onLine={followAlong(scope, sentIds, mode)}
            options={{ title: section.titleFr, onDone: revealLast(scope, sentIds, mode) }}
          >
            Play sentences
          </PlayList>
        </div>
      )}

      {!busy && g.key.length > 0 && (
        <>
          <h3 className="words-title">
            Key words <span className="group-hint">★ these go to your Review</span>
          </h3>
          <ul className="list">
            {g.key.map((w) => (
              <WordItem key={w.id} word={w} onChange={(next) => setWord(w.id, next)} />
            ))}
          </ul>
        </>
      )}

      {!busy && g.phrases.length > 0 && (
        <>
          <h3 className="words-title">Phrases</h3>
          <ul className="list">
            {g.phrases.map((w) => (
              <WordItem key={w.id} word={w} onChange={(next) => setWord(w.id, next)} />
            ))}
          </ul>
        </>
      )}

      {!busy && g.more.length > 0 && (
        <details className="more-words" open={editing || g.more.some((w) => w.flag) || undefined}>
          <summary>
            <Icon name="chevron-right" size={16} className="chev" />
            More words <span className="count">{g.more.length}</span>
          </summary>
          <p className="hint more-hint">Extra words for this situation. Tap ☆ to add one to your Review.</p>
          <ul className="list">
            {g.more.map((w) => (
              <WordItem key={w.id} word={w} onChange={(next) => setWord(w.id, next)} />
            ))}
          </ul>
        </details>
      )}

      {!busy && d.sentences.length > 0 && (
        <>
          <h3 className="words-title">Sentences</h3>
          <ul className="list">
            {d.sentences.map((s) => (
              <LineItem key={s.id} line={s} onChange={(next) => setSentence(s.id, next)} />
            ))}
          </ul>
        </>
      )}

      {!busy &&
        d.tips.map((t) => (
          <aside className="tip" key={t.id}>
            <strong>
              <Rich text={t.title} />
            </strong>
            <p>
              <Rich text={t.text} />
            </p>
          </aside>
        ))}

      {!busy && section.status === "ready" && !editing && scope === "page" && (
        <YourTurn
          sectionId={section.id}
          core={core}
          phrase={phrase?.fr}
          placeholder={phrase?.pattern ? phrase.pattern.split(":")[0].trim() + "…" : undefined}
          onSaved={(line) => onAppend(section.id, line)}
        />
      )}

      {editing && !busy && (
        <div className="card stack mt-4 section-tools">
          <form
            className="input-with-actions"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!extra.trim()) return;
              await onRegenerate(section.id, extra.trim());
              setExtra("");
            }}
          >
            <input type="text" aria-label="Add words about" placeholder="Add words about… (e.g. paying by bank transfer)" value={extra} onChange={(e) => setExtra(e.target.value)} />
            <button className="btn" type="submit" disabled={!extra.trim()}>
              Add
            </button>
          </form>
          <div>
            <button
              className="btn btn-small btn-ghost"
              onClick={async () => {
                const ok = await confirmDialog({
                  title: "Rewrite this section?",
                  body: "The AI writes this section again.",
                  consequences: ["Your edits to this section are replaced.", "Lines that change lose their recordings."],
                  confirmLabel: "Rewrite",
                });
                if (ok) await onRegenerate(section.id);
              }}
            >
              <Icon name="repeat" size={16} /> Rewrite this section
            </button>
          </div>
        </div>
      )}
    </section>
  );
});
