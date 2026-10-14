// The story draft on /new, kept in this browser only (localStorage "ef.draft" = JSON { text, questions? }).
// It survives a reload, a back swipe, or iOS dropping the tab while the learner gets an AI key.
// Other screens may start a draft with saveDraft() and then open /new (e.g. "I used it →").

export type DraftQuestion = { question: string; answer: string };
/** Choices from "About you" on /new, kept until the topic is made (they are saved to the profile then). */
export type DraftAbout = { level: string; gender: string; l1: string };
export type Draft = { text: string; questions?: DraftQuestion[] | null; about?: DraftAbout | null };

const KEY = "ef.draft";

/** The raw stored string (a stable value for useSyncExternalStore). Null when empty or unavailable. */
export function readDraftRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function parseDraft(raw: string | null): Draft | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as Partial<Draft>;
    if (typeof d.text !== "string") return null;
    const questions = Array.isArray(d.questions)
      ? d.questions.filter((q): q is DraftQuestion => typeof q?.question === "string" && typeof q?.answer === "string").slice(0, 5)
      : null;
    const a = d.about;
    const about = a && typeof a.level === "string" && typeof a.gender === "string" && typeof a.l1 === "string" ? { level: a.level, gender: a.gender, l1: a.l1 } : null;
    if (!d.text.trim() && !questions?.length) return about ? { text: "", questions: null, about } : null;
    return { text: d.text.slice(0, 8000), questions: questions?.length ? questions : null, about };
  } catch {
    return null;
  }
}

/** Stores the story text (and optional questions and choices). Nothing to keep clears the draft. */
export function saveDraft(text: string, questions?: DraftQuestion[] | null, about?: DraftAbout | null): void {
  try {
    if (!text.trim() && !questions?.length && !about) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify({ text, ...(questions?.length && { questions }), ...(about && { about }) }));
  } catch {}
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
