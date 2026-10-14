"use client";
// One word or phrase: play · French + gender · IPA · meaning · pronunciation hint · forms · note · example.

import { useState } from "react";
import { WORD_TYPES, type Word } from "@/lib/content/schema";
import { Fr, Rich, Zh } from "../ui";
import { Icon } from "../Icon";
import { speak, usePlayerSelector } from "../player";
import { useStudy, rowKey, rowDomId } from "./context";
import { tapRow, useRevealState } from "./useReveal";
import { FlagMarker, Frame, fillFrame, SayHint, Slot, hiddenParts, parsePattern, usefulForms } from "./bits";
import { FlagBox } from "./FlagBox";
import { EditLine } from "./EditLine";
import { Play } from "./Play";
import { undoToast } from "./undo";

const TYPE_LABEL: Record<string, string> = { noun: "noun", verb: "verb", adj: "adjective", adv: "adverb", phrase: "phrase", other: "" };

export function WordItem({ word: w, onChange }: { word: Word; onChange: (next: Word | null) => void }) {
  const { mode, scope, editing, starred, onStar } = useStudy();
  const key = rowKey(scope, w.id);
  const { shown, heard } = useRevealState(key);
  const playing = usePlayerSelector((s) => s.playing === w.fr);
  const ipaOn = usePlayerSelector((s) => s.ipa);
  const [formsOpen, setFormsOpen] = useState(false);
  const [edit, setEdit] = useState(false);
  const h = hiddenParts(mode, shown);
  const forms = usefulForms(w.forms);
  const longForms = w.type === "verb" && forms;
  const pattern = w.type === "phrase" && w.pattern ? parsePattern(w.pattern) : null;
  const isStarred = starred.has(w.id);
  const tap = () => tapRow(key, mode, w.fr);
  const onRow = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, a, input, select, textarea, label, .flag")) return;
    tap();
  };

  if (editing && edit)
    return (
      <li className="item word editing-row" id={rowDomId(scope, w.id)}>
        <EditLine
          fields={[
            { key: "fr", label: "French", value: w.fr, fr: true },
            { key: "en", label: "Meaning", value: w.en },
            { key: "type", label: "Kind of word", value: w.type, kind: "select", options: WORD_TYPES.map((t) => [t, TYPE_LABEL[t] || "other"]) },
            {
              key: "gender",
              label: "Gender (nouns)",
              value: w.gender ?? "",
              kind: "select",
              options: [
                ["", "—"],
                ["m", "masculine (le, un)"],
                ["f", "feminine (la, une)"],
              ],
            },
            { key: "core", label: "Core word (★, goes to Review)", value: w.core ? "1" : "", kind: "check" },
            { key: "forms", label: w.type === "verb" ? "Forms (je, vous, passé composé)" : "Forms", value: w.forms ?? "" },
            { key: "note", label: "Note", value: w.note ?? "" },
            { key: "exFr", label: "Example (French)", value: w.example?.fr ?? "", fr: true },
            { key: "exEn", label: "Example (meaning)", value: w.example?.en ?? "" },
          ]}
          onCancel={() => setEdit(false)}
          onSave={(v) => {
            setEdit(false);
            const type = (WORD_TYPES as readonly string[]).includes(v.type) ? (v.type as Word["type"]) : w.type;
            onChange({
              ...w,
              fr: v.fr,
              en: v.en,
              type,
              gender: type === "noun" && (v.gender === "m" || v.gender === "f") ? v.gender : null,
              core: v.core === "1",
              forms: v.forms || null,
              note: v.note || null,
              ...(v.fr !== w.fr && { ipa: null, say: null }),
              example: v.exFr && v.exEn ? { fr: v.exFr, en: v.exEn, zh: v.exFr === w.example?.fr ? (w.example?.zh ?? null) : null } : null,
              flag: null,
            });
          }}
        />
      </li>
    );

  return (
    <li
      className={`item word${w.core ? " core" : ""}${w.type === "phrase" ? " phrase" : ""}${playing ? " playing" : ""}${h.any ? " is-hidden" : ""}${w.flag ? " flagged" : ""}`}
      id={rowDomId(scope, w.id)}
      data-row=""
      data-text={w.fr}
      data-key={key}
      onClick={mode !== "all" ? onRow : undefined}
    >
      <Play text={w.fr} label={h.fr ? "this word" : undefined} />
      <div className="body">
        {h.both ? (
          <div className="line">
            <Slot kind="listen" heard={heard} onClick={tap} />
            {w.core && <CoreStar />}
          </div>
        ) : (
          <>
            <div className="line">
              {h.fr ? (
                <Slot kind="fr" onClick={tap} />
              ) : (
                <>
                  <span className="fr" lang="fr">
                    <Fr text={w.fr} />
                  </span>
                  {w.gender && (
                    <span className={`g g-${w.gender}`} title={w.gender === "m" ? "masculine" : "feminine"}>
                      {w.gender}.
                    </span>
                  )}
                </>
              )}
              {TYPE_LABEL[w.type] && w.type !== "phrase" && <span className="type">{TYPE_LABEL[w.type]}</span>}
              {w.core && <CoreStar />}
              {w.flag && !h.any && <FlagMarker />}
            </div>
            {!h.fr && ipaOn && w.ipa && (
              <div className="ipa" aria-label={`Pronunciation ${w.ipa}`}>
                {w.ipa}
              </div>
            )}
            {h.en ? (
              <Slot kind="en" onClick={tap} />
            ) : (
              <div className="meaning">
                <span className="en">{w.en}</span>
                <Zh text={w.zh} className="zh" />
              </div>
            )}
            {!h.any && (
              <>
                {pattern && (
                  <div className="pattern">
                    <Frame frame={pattern.frame} />
                    {pattern.fillers.length > 0 && (
                      <span className="fillers">
                        {pattern.fillers.map((f) => (
                          <button
                            key={f}
                            type="button"
                            className="filler"
                            lang="fr"
                            aria-label={`Play: ${fillFrame(pattern.frame, f)}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              void speak(fillFrame(pattern.frame, f));
                            }}
                          >
                            <Fr text={f} />
                          </button>
                        ))}
                      </span>
                    )}
                  </div>
                )}
                <SayHint say={w.say} />
                {(w.plural || (forms && !longForms)) && (
                  <div className="meta">
                    {w.plural && (
                      <>
                        plural:{" "}
                        <span className="fr-inline" lang="fr">
                          <Fr text={w.plural} />
                        </span>
                      </>
                    )}
                    {w.plural && forms && !longForms && " · "}
                    {forms && !longForms && (
                      <span className="fr-inline" lang="fr">
                        <Fr text={forms} />
                      </span>
                    )}
                  </div>
                )}
                {longForms && (
                  <div className="meta">
                    <button
                      type="button"
                      className="more"
                      aria-expanded={formsOpen}
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormsOpen((o) => !o);
                      }}
                    >
                      Forms <Icon name={formsOpen ? "chevron-down" : "chevron-right"} size={14} />
                    </button>
                    {formsOpen && (
                      <div className="fr-inline forms" lang="fr">
                        <Fr text={forms} />
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
                    <Play text={w.example.fr} small />
                    <div>
                      <div className="fr" lang="fr">
                        <Fr text={w.example.fr} />
                      </div>
                      <div className="en small">{w.example.en}</div>
                      <Zh text={w.example.zh} className="zh small" />
                    </div>
                  </div>
                )}
                {w.flag && (
                  <FlagBox
                    flag={w.flag}
                    current={w.flag.field === "example" && w.example ? w.example.fr : w.fr}
                    onUse={(s) => {
                      onChange(w.flag?.field === "example" && w.example ? { ...w, example: { ...w.example, fr: s }, flag: null } : { ...w, fr: s, flag: null });
                      undoToast("Suggestion used.", () => onChange(w));
                    }}
                    onDismiss={() => onChange({ ...w, flag: null })}
                    onEdit={editing ? () => setEdit(true) : undefined}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>
      {!w.core && !editing && (
        <button
          type="button"
          className={`icon-btn plain star-toggle${isStarred ? " on" : ""}`}
          aria-pressed={isStarred}
          aria-label={isStarred ? `In Review: ${h.fr ? "this word" : w.fr}. Remove` : `Add to Review: ${h.fr ? "this word" : w.fr}`}
          title={isStarred ? "In your Review. Tap to remove." : "Add to your Review"}
          onClick={(e) => {
            e.stopPropagation();
            onStar(w.id, !isStarred);
          }}
        >
          <Icon name={isStarred ? "star-fill" : "star"} size={18} />
        </button>
      )}
      {editing && (
        <div className="row-actions">
          <button type="button" className="icon-btn plain" onClick={() => setEdit(true)} aria-label="Edit word" title="Edit">
            <Icon name="edit" size={18} />
          </button>
          <button
            type="button"
            className="icon-btn plain danger"
            aria-label="Delete word"
            title="Delete"
            onClick={() => {
              onChange(null);
              undoToast("Word deleted.", () => onChange(w));
            }}
          >
            <Icon name="trash" size={18} />
          </button>
        </div>
      )}
    </li>
  );
}

function CoreStar() {
  return (
    <span className="star" role="img" aria-label="core word" title="Core word: it goes to your Review">
      ★
    </span>
  );
}
