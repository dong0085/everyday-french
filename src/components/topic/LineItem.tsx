"use client";
// A sentence-like row: section sentences, "My story" lines and dialogue lines.

import { useState } from "react";
import type { Sentence } from "@/lib/content/schema";
import { Fr, Rich, Zh } from "../ui";
import { Icon } from "../Icon";
import { usePlayerSelector } from "../player";
import { useStudy, rowKey, rowDomId } from "./context";
import { tapRow, useRevealState } from "./useReveal";
import { FlagMarker, SayHint, Slot, WhoTag, hiddenParts } from "./bits";
import { FlagBox } from "./FlagBox";
import { EditLine, type EditField } from "./EditLine";
import { Play } from "./Play";
import { undoToast } from "./undo";

export function LineItem({
  line,
  variant = "sentence",
  onChange,
  editWho,
  forceHidden,
  onHiddenTap,
  turn,
}: {
  line: Sentence;
  variant?: "sentence" | "story" | "bubble";
  onChange: (next: Sentence | null) => void;
  /** Dialogue lines: "who" can be changed while editing. */
  editWho?: boolean;
  /** Role-play: the learner's line stays hidden until it is their turn. */
  forceHidden?: boolean;
  onHiddenTap?: () => void;
  /** Role-play: it is the learner's turn to say this line. */
  turn?: boolean;
}) {
  const { mode, scope, editing } = useStudy();
  const key = rowKey(scope, line.id);
  const { shown, heard } = useRevealState(key);
  const playing = usePlayerSelector((s) => s.playing === line.fr);
  const [edit, setEdit] = useState(false);
  const who = line.who ?? null;
  const h = forceHidden ? { fr: true, en: false, both: false, any: true } : hiddenParts(mode, shown);
  const tap = () => (forceHidden ? onHiddenTap?.() : tapRow(key, mode, line.fr));
  const onRow = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, a, input, select, textarea, label, .flag")) return;
    tap();
  };

  if (editing && edit) {
    const fields: EditField[] = [
      { key: "fr", label: "French", value: line.fr, fr: true },
      { key: "en", label: "Meaning", value: line.en },
      { key: "note", label: "Note", value: line.note ?? "" },
    ];
    if (editWho)
      fields.push({
        key: "who",
        label: "Who says it",
        value: who ?? "them",
        kind: "select",
        options: [
          ["them", "Eux — the other person"],
          ["me", "Moi — me"],
        ],
      });
    return (
      <li className={`item ${variant} editing-row`} id={rowDomId(scope, line.id)}>
        <EditLine
          fields={fields}
          onCancel={() => setEdit(false)}
          onSave={(v) => {
            setEdit(false);
            onChange({
              ...line,
              fr: v.fr,
              en: v.en,
              note: v.note || null,
              ...(editWho && { who: v.who === "me" ? "me" : "them" }),
              ...(v.fr !== line.fr && { say: null, zh: line.zh ?? null }),
              flag: null,
            });
          }}
        />
      </li>
    );
  }

  return (
    <li
      className={`item ${variant}${who ? ` who-${who}-row` : ""}${playing ? " playing" : ""}${h.any ? " is-hidden" : ""}${line.flag ? " flagged" : ""}${turn ? " turn" : ""}`}
      id={rowDomId(scope, line.id)}
      data-row=""
      data-text={line.fr}
      data-key={key}
      onClick={h.any || (mode !== "all" && !forceHidden) ? onRow : undefined}
    >
      <Play text={line.fr} label={h.fr ? "this line" : undefined} />
      <div className="body">
        {h.both ? (
          <div className="line">
            <WhoTag who={who} />
            <Slot kind="listen" heard={heard} onClick={tap} />
          </div>
        ) : (
          <>
            <div className="line">
              <WhoTag who={who} />
              {line.mine && <span className="badge badge-accent">Yours</span>}
              {h.fr ? (
                <Slot kind={forceHidden ? (turn ? "turn" : "wait") : "fr"} onClick={tap} />
              ) : (
                <span className="fr" lang="fr">
                  <Fr text={line.fr} />
                </span>
              )}
              {line.flag && !h.any && <FlagMarker />}
            </div>
            {h.en ? (
              <Slot kind="en" onClick={tap} />
            ) : (
              <>
                <div className="en">{line.en}</div>
                <Zh text={line.zh} />
              </>
            )}
            {!h.any && (
              <>
                <SayHint say={line.say} />
                {line.note && (
                  <div className="note">
                    <Rich text={line.note} />
                  </div>
                )}
                {line.flag && (
                  <FlagBox
                    flag={line.flag}
                    current={line.fr}
                    onUse={(s) => {
                      onChange({ ...line, fr: s, flag: null });
                      undoToast("Suggestion used.", () => onChange(line));
                    }}
                    onDismiss={() => onChange({ ...line, flag: null })}
                    onEdit={editing ? () => setEdit(true) : undefined}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>
      {editing && (
        <div className="row-actions">
          <button type="button" className="icon-btn plain" onClick={() => setEdit(true)} aria-label="Edit line" title="Edit">
            <Icon name="edit" size={18} />
          </button>
          <button
            type="button"
            className="icon-btn plain danger"
            aria-label="Delete line"
            title="Delete"
            onClick={() => {
              onChange(null);
              undoToast("Line deleted.", () => onChange(line));
            }}
          >
            <Icon name="trash" size={18} />
          </button>
        </div>
      )}
    </li>
  );
}
