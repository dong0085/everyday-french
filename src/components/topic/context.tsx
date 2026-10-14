"use client";
// What every row on the topic page needs to know, without passing it through each level.

import { createContext, useContext } from "react";
import type { Mode } from "../player";

export type StudyContext = {
  topicId: string;
  /** The quiz mode for these rows (the guided study sets its own). */
  mode: Mode;
  /** Prefix for reveal keys and DOM ids: "page" on the page, something else in the guided study. */
  scope: string;
  editing: boolean;
  hasLlm: boolean;
  isExample: boolean;
  /** Line ids of extra words the learner added to Review. */
  starred: ReadonlySet<string>;
  onStar: (lineId: string, starred: boolean) => void;
};

const Ctx = createContext<StudyContext>({
  topicId: "",
  mode: "all",
  scope: "page",
  editing: false,
  hasLlm: false,
  isExample: false,
  starred: new Set(),
  onStar: () => {},
});

export const StudyProvider = Ctx.Provider;
export const useStudy = () => useContext(Ctx);

/** The reveal-store key of a line in this scope. */
export const rowKey = (scope: string, id: string) => `${scope}:${id}`;
/** The DOM id of a line (only on the page, so the guided study never duplicates ids). */
export const rowDomId = (scope: string, id: string) => (scope === "page" ? `line-${id}` : undefined);
