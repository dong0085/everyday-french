"use client";

import { useState } from "react";

/** A small inline form: [key, label, value] fields, Save and Cancel. */
export function EditLine({
  fields,
  onSave,
  onCancel,
}: {
  fields: [string, string, string][];
  onSave: (values: Record<string, string>) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map(([k, , v]) => [k, v])));
  return (
    <form
      className="edit-grid"
      onSubmit={(e) => {
        e.preventDefault();
        const v = Object.fromEntries(Object.entries(values).map(([k, x]) => [k, x.trim()]));
        if (!v.fr || ("en" in v && !v.en)) return;
        onSave(v);
      }}
    >
      {fields.map(([k, label]) => (
        <label key={k} className="field">
          <span className="small">{label}</span>
          <input type="text" value={values[k]} onChange={(e) => setValues((s) => ({ ...s, [k]: e.target.value }))} lang={k === "fr" ? "fr" : undefined} />
        </label>
      ))}
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
