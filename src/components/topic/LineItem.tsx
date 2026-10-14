"use client";
// A sentence-like row: section sentences and "My story" lines.

import { forwardRef, useState } from "react";
import type { Sentence } from "@/lib/content/schema";
import { Fr, PlayButton, Rich } from "../ui";
import { useReveal, type Mode } from "./useReveal";
import { FlagBox } from "./FlagBox";
import { EditLine } from "./EditLine";

export const LineItem = forwardRef<
  HTMLLIElement,
  { line: Sentence; mode: Mode; revealAll: number; editing: boolean; playing?: boolean; className?: string; onChange: (next: Sentence | null) => void }
>(function LineItem({ line, mode, revealAll, editing, playing, className, onChange }, ref) {
  const { revealed, onClick } = useReveal(mode, revealAll, line.fr);
  const [edit, setEdit] = useState(false);
  if (editing && edit)
    return (
      <li className={`item ${className ?? ""}`} ref={ref}>
        <EditLine
          fields={[
            ["fr", "French", line.fr],
            ["en", "Meaning", line.en],
            ["note", "Note", line.note ?? ""],
          ]}
          onCancel={() => setEdit(false)}
          onSave={(v) => {
            setEdit(false);
            onChange({ ...line, fr: v.fr, en: v.en, note: v.note || null, flag: null });
          }}
        />
      </li>
    );
  return (
    <li className={`item ${className ?? ""}${revealed ? " revealed" : ""}${playing ? " playing" : ""}`} ref={ref} onClick={onClick}>
      <PlayButton text={line.fr} />
      <div className="body">
        <div className="fr hide-fr" lang="fr">
          <Fr text={line.fr} /> {line.flag && <span title="Flagged by the review">⚠</span>}
        </div>
        <div className="en hide-en">{line.en}</div>
        {line.zh && <div className="zh hide-en">{line.zh}</div>}
        {line.note && (
          <div className="note">
            <Rich text={line.note} />
          </div>
        )}
        {line.flag && <FlagBox flag={line.flag} onUse={(s) => onChange({ ...line, fr: s, flag: null })} onDismiss={() => onChange({ ...line, flag: null })} />}
      </div>
      {editing && (
        <div className="row" style={{ flexDirection: "column" }}>
          <button type="button" className="btn btn-small" onClick={() => setEdit(true)} aria-label="Edit line">
            ✎
          </button>
          <button type="button" className="btn btn-small btn-danger" onClick={() => confirm("Delete this line?") && onChange(null)} aria-label="Delete line">
            ✕
          </button>
        </div>
      )}
    </li>
  );
});

