// "Your turn": the request body and the clean-up of the AI's feedback (shared by the route and tests).
import { z } from "zod";
import type { FeedbackOut } from "./schema";

export const attemptBody = z.object({
  sectionId: z.string().uuid().nullable(),
  text: z.string().trim().min(1).max(400),
  save: z.boolean(),
});

const clip = (s: string | null | undefined, max = 400) => (s ?? "").trim().slice(0, max);

/** Keeps the AI's feedback within the stored limits; an empty "fixed" falls back to the learner's text. */
export function tidyFeedback(out: FeedbackOut, attempt: string): FeedbackOut {
  const fixed = clip(out.fixed) || attempt;
  const natural = clip(out.natural);
  return {
    ok: out.ok,
    fixed,
    en: clip(out.en),
    note: clip(out.note, 600) || null,
    natural: natural && natural !== fixed ? natural : null,
  };
}
