"use client";
// A line the review flagged: what is wrong, the change as before → after, and what to do.

import type { Flag } from "@/lib/content/schema";
import { Fr, Rich } from "../ui";
import { Icon } from "../Icon";

export function FlagBox({
  flag,
  current,
  onUse,
  onDismiss,
  onEdit,
}: {
  flag: Flag;
  /** The French the suggestion would replace. */
  current: string;
  onUse: (suggestion: string) => void;
  onDismiss: () => void;
  onEdit?: () => void;
}) {
  return (
    <div className="flag" role="note" aria-label="Flagged by the review" onClick={(e) => e.stopPropagation()}>
      <p className="flag-problem">
        <Icon name="info" size={16} />
        <span>
          <Rich text={flag.problem} />
        </span>
      </p>
      {flag.suggestion && (
        <p className="flag-diff" lang="fr">
          <del>
            <span className="visually-hidden">Now: </span>
            <Fr text={current} />
          </del>
          <Icon name="arrow-right" size={14} />
          <ins>
            <span className="visually-hidden">Suggestion: </span>
            <Fr text={flag.suggestion} />
          </ins>
        </p>
      )}
      <div className="row">
        {flag.suggestion && (
          <button type="button" className="btn btn-small btn-primary" onClick={() => onUse(flag.suggestion!)}>
            Use suggestion
          </button>
        )}
        <button type="button" className="btn btn-small" onClick={onDismiss}>
          Keep mine
        </button>
        {onEdit && (
          <button type="button" className="btn btn-small btn-ghost" onClick={onEdit}>
            <Icon name="edit" size={16} /> Edit
          </button>
        )}
      </div>
    </div>
  );
}
