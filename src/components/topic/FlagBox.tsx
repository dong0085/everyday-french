"use client";

import type { Flag } from "@/lib/content/schema";
import { Fr, Rich } from "../ui";

export function FlagBox({ flag, onUse, onDismiss }: { flag: Flag; onUse: (suggestion: string) => void; onDismiss: () => void }) {
  return (
    <div className="flag" role="note">
      <p>
        ⚠ <Rich text={flag.problem} />
      </p>
      {flag.suggestion && (
        <p>
          Suggestion:{" "}
          <span className="fr-inline" lang="fr">
            <Fr text={flag.suggestion} />
          </span>
        </p>
      )}
      <div className="row">
        {flag.suggestion && (
          <button type="button" className="btn btn-small" onClick={() => onUse(flag.suggestion!)}>
            Use suggestion
          </button>
        )}
        <button type="button" className="btn btn-small btn-ghost" onClick={onDismiss}>
          It&apos;s fine
        </button>
      </div>
    </div>
  );
}
