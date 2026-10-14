"use client";

import { useEffect, useRef, useState } from "react";

export type EditField =
  | { key: string; label: string; value: string; kind?: "text"; fr?: boolean }
  | { key: string; label: string; value: string; kind: "select"; options: [string, string][] }
  | { key: string; label: string; value: string; kind: "check" };

/**
 * A small inline form. The first field gets focus, Escape cancels, ⌘/Ctrl+Enter saves.
 * Check fields give "1" or "".
 */
export function EditLine({ fields, onSave, onCancel }: { fields: EditField[]; onSave: (values: Record<string, string>) => void; onCancel: () => void }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.key, f.value])));
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => first.current?.focus(), []);
  const set = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }));
  const frChanged = "fr" in values && values.fr.trim() !== fields.find((f) => f.key === "fr")?.value;

  const submit = () => {
    const v = Object.fromEntries(Object.entries(values).map(([k, x]) => [k, x.trim()]));
    if (!v.fr || ("en" in v && !v.en)) return;
    onSave(v);
  };

  return (
    <form
      className="edit-grid"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          submit();
        }
      }}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {fields.map((f, i) =>
        f.kind === "select" ? (
          <label key={f.key} className="field">
            <span className="small">{f.label}</span>
            <select value={values[f.key]} onChange={(e) => set(f.key, e.target.value)}>
              {f.options.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        ) : f.kind === "check" ? (
          <label key={f.key} className="checkbox edit-check">
            <input type="checkbox" checked={values[f.key] === "1"} onChange={(e) => set(f.key, e.target.checked ? "1" : "")} />
            <span>{f.label}</span>
          </label>
        ) : (
          <label key={f.key} className="field">
            <span className="small">{f.label}</span>
            <input ref={i === 0 ? first : undefined} type="text" value={values[f.key]} onChange={(e) => set(f.key, e.target.value)} lang={f.fr ? "fr" : undefined} />
          </label>
        ),
      )}
      {frChanged && <p className="hint m-0">Changing the French removes this line&apos;s recording. You can make a new one after.</p>}
      <div className="row">
        <button type="submit" className="btn btn-small btn-primary">
          Save
        </button>
        <button type="button" className="btn btn-small btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
