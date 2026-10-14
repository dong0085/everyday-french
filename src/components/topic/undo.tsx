"use client";
// A short "Done · Undo" message for edits on the topic page (use suggestion, delete a line).

import { useEffect, useState } from "react";

type Item = { id: number; msg: string; undo: () => void };
let push: ((item: Item) => void) | null = null;
let next = 0;

export function undoToast(msg: string, undo: () => void) {
  push?.({ id: ++next, msg, undo });
}

export function UndoHost() {
  const [item, setItem] = useState<Item | null>(null);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    push = (i) => {
      setItem(i);
      clearTimeout(t);
      t = setTimeout(() => setItem(null), 7000);
    };
    return () => {
      push = null;
      clearTimeout(t);
    };
  }, []);
  return (
    <div className="toast-region undo-region" role="status" aria-live="polite">
      {item && (
        <div className="toast" key={item.id}>
          <span>{item.msg}</span>
          <button
            type="button"
            className="undo-btn"
            onClick={() => {
              item.undo();
              setItem(null);
            }}
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
