"use client";

import { useState } from "react";
import type { FullSection } from "@/lib/data";
import type { SectionData, Word } from "@/lib/content/schema";
import { Fr, PlayButton, Rich, Spinner } from "../ui";
import { useReveal, type Mode } from "./useReveal";
import { FlagBox } from "./FlagBox";
import { EditLine } from "./EditLine";
import { LineItem } from "./LineItem";

const TYPE_LABEL: Record<string, string> = { noun: "noun", verb: "verb", adj: "adjective", adv: "adverb", phrase: "phrase", other: "" };

export function SectionView({
  section,
  index,
  mode,
  revealAll,
  editing,
  onSave,
  onRegenerate,
  onRetry,
}: {
  section: FullSection;
  index: number;
  mode: Mode;
  revealAll: number;
  editing: boolean;
  onSave: (data: SectionData) => void;
  onRegenerate: (extra?: string) => Promise<void>;
  onRetry: () => void;
}) {
  const [extra, setExtra] = useState("");
  const d = section.data;
  const words = [...d.words].sort((a, b) => Number(b.core) - Number(a.core));
  const busy = section.status === "pending" || section.status === "generating";

  const setWord = (id: string, next: Word | null) =>
    onSave({ ...d, words: next ? d.words.map((w) => (w.id === id ? next : w)) : d.words.filter((w) => w.id !== id) });

  return (
    <section className="topic-section" id={section.slug}>
      <header>
        <span className="num">{index + 1}</span>
        <div>
          <h2 lang="fr">
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
        <div className="stack" style={{ marginTop: 14 }}>
          <div className="status-line">
            <Spinner /> Writing this section…
          </div>
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      )}
      {section.status === "failed" && (
        <div className="error-box stack" style={{ marginTop: 14 }}>
          <p>{section.error || "This section could not be written."}</p>
          <div className="row">
            <button className="btn btn-small btn-primary" onClick={onRetry}>
              Retry
            </button>
          </div>
        </div>
      )}

      {!busy && words.length > 0 && (
        <>
          <h3>
            Words <span className="star">★ = core</span>
          </h3>
          <ul className="list">
            {words.map((w) => (
              <WordItem key={w.id} word={w} mode={mode} revealAll={revealAll} editing={editing} onChange={(next) => setWord(w.id, next)} />
            ))}
          </ul>
        </>
      )}

      {!busy && d.sentences.length > 0 && (
        <>
          <h3>Sentences</h3>
          <ul className="list">
            {d.sentences.map((s) => (
              <LineItem
                key={s.id}
                line={s}
                mode={mode}
                revealAll={revealAll}
                editing={editing}
                className="sentence"
                onChange={(next) =>
                  onSave({ ...d, sentences: next ? d.sentences.map((x) => (x.id === s.id ? next : x)) : d.sentences.filter((x) => x.id !== s.id) })
                }
              />
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

      {editing && !busy && (
        <div className="card stack" style={{ marginTop: 14 }}>
          <form
            className="row"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!extra.trim()) return;
              await onRegenerate(extra.trim());
              setExtra("");
            }}
          >
            <input type="text" placeholder="Add words about… (e.g. paying by bank transfer)" value={extra} onChange={(e) => setExtra(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
            <button className="btn btn-small" type="submit" disabled={!extra.trim()}>
              Add
            </button>
          </form>
          <div>
            <button className="btn btn-small btn-ghost" onClick={() => confirm("Rewrite this whole section? Your edits to it will be replaced.") && onRegenerate()}>
              ↻ Rewrite this section
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function WordItem({ word: w, mode, revealAll, editing, onChange }: { word: Word; mode: Mode; revealAll: number; editing: boolean; onChange: (next: Word | null) => void }) {
  const { revealed, onClick } = useReveal(mode, revealAll, w.fr);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(false);

  if (editing && edit)
    return (
      <li className="item">
        <EditLine
          fields={[
            ["fr", "French", w.fr],
            ["en", "Meaning", w.en],
            ["forms", w.type === "verb" ? "Forms (je, vous, passé composé)" : "Forms", w.forms ?? ""],
            ["note", "Note", w.note ?? ""],
            ["exFr", "Example (French)", w.example?.fr ?? ""],
            ["exEn", "Example (meaning)", w.example?.en ?? ""],
          ]}
          onCancel={() => setEdit(false)}
          onSave={(v) => {
            setEdit(false);
            onChange({
              ...w,
              fr: v.fr,
              en: v.en,
              forms: v.forms || null,
              note: v.note || null,
              example: v.exFr && v.exEn ? { fr: v.exFr, en: v.exEn } : null,
              flag: null,
            });
          }}
        />
      </li>
    );

  const details = w.type === "verb" && w.forms;
  return (
    <li className={`item word${w.core ? " core" : ""}${revealed ? " revealed" : ""}`} onClick={onClick}>
      <PlayButton text={w.fr} />
      <div className="body">
        <div className="line">
          <span className="fr hide-fr" lang="fr">
            <Fr text={w.fr} />
          </span>
          {w.gender && (
            <span className={`g g-${w.gender}`} title={w.gender === "m" ? "masculine" : "feminine"}>
              {w.gender}.
            </span>
          )}
          {TYPE_LABEL[w.type] && <span className="type">{TYPE_LABEL[w.type]}</span>}
          {w.core && (
            <span className="star" aria-label="core word">
              ★
            </span>
          )}
          {w.flag && <span title="Flagged by the review">⚠</span>}
        </div>
        <div className="en hide-en">{w.en}</div>
        {w.zh && <div className="zh hide-en">{w.zh}</div>}
        {(w.plural || (w.forms && !details)) && (
          <div className="meta hide-fr">
            {w.plural && (
              <>
                plural: <span className="fr-inline">{w.plural}</span>
              </>
            )}
            {w.plural && w.forms && !details && " · "}
            {w.forms && !details && <span className="fr-inline">{w.forms}</span>}
          </div>
        )}
        {details && (
          <div className="meta hide-fr">
            <button
              type="button"
              className="more"
              aria-expanded={open}
              onClick={(e) => {
                e.stopPropagation();
                setOpen((o) => !o);
              }}
            >
              {open ? "Hide forms ▴" : "Forms ▾"}
            </button>
            {open && (
              <div className="fr-inline" lang="fr">
                <Fr text={w.forms!} />
              </div>
            )}
          </div>
        )}
        {w.note && (
          <div className="note">
            <Rich text={w.note} />
          </div>
        )}
        {w.example && (
          <div className="example">
            <PlayButton text={w.example.fr} small />
            <div>
              <div className="fr hide-fr" lang="fr">
                <Fr text={w.example.fr} />
              </div>
              <div className="en hide-en small">{w.example.en}</div>
            </div>
          </div>
        )}
        {w.flag && (
          <FlagBox
            flag={w.flag}
            onUse={(s) =>
              onChange(
                w.flag?.field === "example" && w.example ? { ...w, example: { ...w.example, fr: s }, flag: null } : { ...w, fr: s, flag: null },
              )
            }
            onDismiss={() => onChange({ ...w, flag: null })}
          />
        )}
      </div>
      {editing && (
        <div className="row" style={{ flexDirection: "column" }}>
          <button type="button" className="btn btn-small" onClick={() => setEdit(true)} aria-label="Edit word">
            ✎
          </button>
          <button type="button" className="btn btn-small btn-danger" onClick={() => confirm("Delete this word?") && onChange(null)} aria-label="Delete word">
            ✕
          </button>
        </div>
      )}
    </li>
  );
}
