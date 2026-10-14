"use client";
// Every word and phrase from the learner's topics: search (accents optional), filters, play, star for review.

import Link from "next/link";
import { useDeferredValue, useEffect, useState, type ReactNode } from "react";
import { fold } from "@/lib/content/french";
import type { WordType } from "@/lib/content/schema";
import { addClips, stop } from "./player";
import { api, Fr, PlayButton, Rich, toast, toastError } from "./ui";
import { Icon } from "./Icon";

export type WordRow = {
  key: string;
  topicId: string;
  topicTitleFr: string;
  lineId: string;
  fr: string;
  en: string;
  zh: string | null;
  type: WordType;
  gender: "m" | "f" | null;
  ipa: string | null;
  say: string | null;
  forms: string | null;
  plural: string | null;
  note: string | null;
  example: { fr: string; en: string; zh: string | null } | null;
  core: boolean;
  starred: boolean;
  shaky: boolean;
};

type Filter = "all" | "m" | "f" | "verb" | "phrase" | "starred" | "shaky";

const ARTICLE = /^(le |la |les |l'|un |une |des |du |de la |de l'|d'|se |s')/;
/** "une table" → "table", for sorting and letter groups. */
const sortKey = (fr: string, type: WordType) => {
  const f = fold(fr.replace(/’/g, "'"));
  return (type === "noun" || type === "verb" ? f.replace(ARTICLE, "") : f).replace(/^[^\p{L}]+/u, "");
};

export function WordBank({ rows, topicCount, clips }: { rows: WordRow[]; topicCount: number; clips: Record<string, string> }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [stars, setStars] = useState(() => new Set(rows.filter((r) => r.starred).map((r) => r.key)));
  const q = fold(useDeferredValue(query).trim());
  useEffect(() => {
    addClips(clips);
    return () => stop();
  }, [clips]);

  const matches = (r: WordRow, f: Filter) =>
    f === "all" ||
    (f === "m" && r.type === "noun" && r.gender === "m") ||
    (f === "f" && r.type === "noun" && r.gender === "f") ||
    (f === "verb" && r.type === "verb") ||
    (f === "phrase" && r.type === "phrase") ||
    (f === "starred" && stars.has(r.key)) ||
    (f === "shaky" && r.shaky);

  const FILTERS: { id: Filter; label: ReactNode; title?: string }[] = [
    { id: "all", label: "All" },
    {
      id: "m",
      label: (
        <>
          Nouns <span className="g g-m">le</span>
        </>
      ),
    },
    {
      id: "f",
      label: (
        <>
          Nouns <span className="g g-f">la</span>
        </>
      ),
    },
    { id: "verb", label: "Verbs" },
    { id: "phrase", label: "Phrases" },
    {
      id: "starred",
      label: (
        <>
          <Icon name="star-fill" size={14} className="star" /> Starred
        </>
      ),
    },
    { id: "shaky", label: "Shaky", title: "Words you marked Not yet twice or more" },
  ];

  const shown = rows
    .filter((r) => matches(r, filter))
    .filter((r) => !q || fold(r.fr).includes(q) || fold(r.en).includes(q) || (r.zh ?? "").includes(query.trim()) || sortKey(r.fr, r.type).startsWith(q))
    .map((r) => ({ r, k: sortKey(r.fr, r.type) }))
    .sort((a, b) => a.k.localeCompare(b.k, "fr") || a.r.fr.localeCompare(b.r.fr, "fr"));

  const groups: { letter: string; rows: WordRow[] }[] = [];
  for (const { r, k } of shown) {
    const letter = (k[0] ?? "#").toUpperCase();
    if (groups.at(-1)?.letter !== letter) groups.push({ letter, rows: [] });
    groups.at(-1)!.rows.push(r);
  }

  const toggleStar = async (r: WordRow) => {
    const on = !stars.has(r.key);
    const flip = (add: boolean) =>
      setStars((s) => {
        const n = new Set(s);
        if (add) n.add(r.key);
        else n.delete(r.key);
        return n;
      });
    flip(on);
    try {
      await api("/api/review/star", { json: { topicId: r.topicId, lineId: r.lineId, starred: on } });
      if (on && !r.core) toast("Starred. It will come up in Review.");
    } catch (e) {
      flip(!on);
      toastError(e);
    }
  };

  if (!rows.length)
    return (
      <main className="page words-page">
        <h1>Words</h1>
        <div className="card review-empty mt-4">
          <p className="m-0">No words yet. Make a topic, and its words collect here.</p>
          <Link className="btn btn-primary self-start" href="/new">
            <Icon name="plus" size={18} /> Make a topic
          </Link>
        </div>
      </main>
    );

  return (
    <main className="page words-page">
      <h1>Words</h1>
      <p className="sub small">
        {rows.length} {rows.length === 1 ? "word" : "words"} from {topicCount} {topicCount === 1 ? "topic" : "topics"}
      </p>

      <div className="words-tools">
        <label className="words-search">
          <Icon name="search" size={18} />
          <span className="visually-hidden">Search your words</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search in French, English or 中文" autoComplete="off" spellCheck={false} />
        </label>
        <div className="chips" role="group" aria-label="Show">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" aria-pressed={filter === f.id} title={f.title} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {(q || filter !== "all") && (
        <p className="small muted words-count" aria-live="polite">
          {shown.length ? `Showing ${shown.length}` : filter === "starred" && !q ? "No starred words yet. Tap the star on a word to add it to Review." : filter === "shaky" && !q ? "Nothing shaky. Words you mark Not yet twice show here." : "No words match."}
        </p>
      )}

      {groups.map((g) => (
        <section key={g.letter} className="word-group" aria-labelledby={`l-${g.letter}`}>
          <h2 className="word-letter" id={`l-${g.letter}`}>
            {g.letter}
          </h2>
          <ul className="word-list">
            {g.rows.map((r) => {
              const isOpen = open === r.key;
              const starred = stars.has(r.key);
              return (
                <li key={r.key} className={`word-row${isOpen ? " open" : ""}`}>
                  <PlayButton text={r.fr} />
                  <div className="word-body">
                    <button type="button" className="word-main" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : r.key)}>
                      <span className="word-line">
                        <span className="fr" lang="fr">
                          <Fr text={r.fr} />
                        </span>
                        {r.gender && (
                          <span className={`g g-${r.gender}`} title={r.gender === "m" ? "masculine" : "feminine"}>
                            {r.gender}.
                          </span>
                        )}
                        {r.type === "verb" && <span className="word-type">verb</span>}
                        {r.type === "phrase" && <span className="word-type">phrase</span>}
                      </span>
                      <span className="word-meaning">
                        <span className="en">{r.en}</span>
                        {r.ipa && <span className="ipa">{r.ipa}</span>}
                      </span>
                      {r.zh && (
                        <span className="zh" lang="zh-Hans">
                          {r.zh}
                        </span>
                      )}
                    </button>
                    {isOpen && (
                      <div className="word-more fade-in">
                        {r.example && (
                          <div className="rc-example">
                            <PlayButton small text={r.example.fr} />
                            <div>
                              <div className="fr-inline" lang="fr">
                                <Fr text={r.example.fr} />
                              </div>
                              <div className="en small">{r.example.en}</div>
                              {r.example.zh && (
                                <div className="zh" lang="zh-Hans">
                                  {r.example.zh}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {r.forms && <p className="small m-0 fr-inline">{r.forms}</p>}
                        {r.plural && (
                          <p className="small m-0">
                            plural: <span className="fr-inline">{r.plural}</span>
                          </p>
                        )}
                        {r.say && (
                          <p className="small m-0 muted">
                            <Rich text={r.say} />
                          </p>
                        )}
                        {r.note && (
                          <p className="small m-0">
                            <Rich text={r.note} />
                          </p>
                        )}
                        {!r.example && !r.forms && !r.note && !r.say && !r.plural && <p className="small m-0 muted">No example for this word.</p>}
                      </div>
                    )}
                    <Link className="word-topic" href={`/topics/${r.topicId}`}>
                      <Fr text={r.topicTitleFr} />
                    </Link>
                  </div>
                  <button
                    type="button"
                    className={`icon-btn plain word-star${starred ? " on" : ""}`}
                    aria-pressed={starred}
                    aria-label={`Star for review: ${r.fr}`}
                    title={starred ? "Starred for review" : "Star: add to review"}
                    onClick={() => void toggleStar(r)}
                  >
                    <Icon name={starred ? "star-fill" : "star"} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}
