// Topic content: what is stored in the database and what the AI must return.
// Stored shapes carry ids and review flags; AI output shapes are simpler (ids are added on the server).

import { z } from "zod";

export const LEVELS = ["A1", "A2", "B1", "B2"] as const;
export type Level = (typeof LEVELS)[number];
export type SelfGender = "m" | "f" | "x";
export type ExplainLang = "en" | "zh";
/** The learner's first language: notes point out what it does not mark. */
export type L1 = "zh" | "en" | "other";
export type Who = "me" | "them";

export const WORD_TYPES = ["noun", "verb", "adj", "adv", "phrase", "other"] as const;
export type WordType = (typeof WORD_TYPES)[number];

// ---------- stored content ----------

export const flagSchema = z.object({
  problem: z.string().max(400),
  suggestion: z.string().max(400).nullable(),
  field: z.enum(["fr", "example"]).default("fr"), // which French text the suggestion replaces
});
export type Flag = z.infer<typeof flagSchema>;

const line = z.string().trim().min(1).max(400);
const opt = z.string().trim().max(600).nullable().default(null);

export const exampleSchema = z.object({ fr: line, en: line, zh: opt });

export const wordSchema = z.object({
  id: z.string().min(1).max(40),
  fr: line,
  en: line,
  zh: opt,
  type: z.enum(WORD_TYPES),
  core: z.boolean().default(false),
  gender: z.enum(["m", "f"]).nullable().default(null),
  plural: opt,
  forms: opt,
  note: opt,
  ipa: opt, // "/ɛ̃ kʁwasɑ̃/", France French, liaison marked ‿
  say: opt, // a pronunciation hint in the explanation language, only when there is a trap
  pattern: opt, // phrases only: "Je voudrais + [chose] : un café · l'addition"
  example: exampleSchema.nullable().default(null),
  flag: flagSchema.nullable().default(null),
});
export type Word = z.infer<typeof wordSchema>;

export const sentenceSchema = z.object({
  id: z.string().min(1).max(40),
  fr: line,
  en: line,
  zh: opt,
  note: opt,
  who: z.enum(["me", "them"]).nullable().default(null), // who says it: the learner, or the other person
  say: opt,
  mine: z.boolean().default(false), // the learner wrote it ("Your turn")
  flag: flagSchema.nullable().default(null),
});
export type Sentence = z.infer<typeof sentenceSchema>;

export const tipSchema = z.object({
  id: z.string().min(1).max(40),
  title: line,
  text: z.string().trim().min(1).max(1200),
});
export type Tip = z.infer<typeof tipSchema>;

export const sectionDataSchema = z.object({
  words: z.array(wordSchema).max(40).default([]),
  sentences: z.array(sentenceSchema).max(30).default([]),
  tips: z.array(tipSchema).max(5).default([]),
});
export type SectionData = z.infer<typeof sectionDataSchema>;

export const storyLineSchema = sentenceSchema;
export type StoryLine = Sentence;

/** "Le dialogue": the key exchange, alternating them / me. */
export const dialogueLineSchema = sentenceSchema;
export type DialogueLine = Sentence;

/** "Next time, say…": lines for the next time this situation happens. */
export const nextTimeSchema = z.object({ id: z.string().min(1).max(40), fr: line, en: line, zh: opt });
export type NextTimeLine = z.infer<typeof nextTimeSchema>;

/** A topic's generation stage, as the end of "Stopped while …". */
export const STAGE_NAMES: Record<string, string> = {
  outline: "planning the sections",
  sections: "writing the words and sentences",
  story: "retelling your story in French",
  dialogue: "writing the dialogue",
  check: "checking the French",
};

// ---------- AI output (no ids, nullable rather than optional: strict JSON modes need every key) ----------

export const outlineOut = z.object({
  title: z.string().describe("Short topic title in the explanation language"),
  titleFr: z.string().describe("The same title in simple French"),
  summary: z.string().describe("One or two sentences about what this topic covers, in the explanation language"),
  story: z.string().describe("The learner's story, cleaned up and clear, in the explanation language, first person"),
  genderNote: z
    .string()
    .nullable()
    .describe("One short note on how 'je' past participles change for the other gender, or null if none occur"),
  sections: z
    .array(
      z.object({
        slug: z.string().describe("Lowercase ASCII words joined by dashes, unique in this topic"),
        title: z.string().describe("Section title in the explanation language"),
        titleFr: z.string().describe("Section title in French"),
        intro: z.string().describe("One short lead-in line in the explanation language"),
        coreWords: z
          .array(z.string())
          .describe("3 to 6 core French words or phrases this section will teach, each with article if a noun"),
      }),
    )
    .describe("Sections in the order things happened"),
  nextTime: z
    .array(z.object({ fr: z.string(), en: z.string(), zh: z.string().nullable() }))
    .describe("3 short French lines to say the next time this situation happens (present or futur proche)"),
});
export type OutlineOut = z.infer<typeof outlineOut>;

export const sectionOut = z.object({
  words: z.array(
    z.object({
      fr: z.string().describe("French: nouns with article (le/la/l'/un/une), verbs as infinitive, phrases as said"),
      en: z.string().describe("Meaning in the explanation language"),
      zh: z.string().nullable().describe("Short Chinese gloss, or null when not requested"),
      type: z.enum(WORD_TYPES),
      core: z.boolean().describe("true for this section's core words"),
      gender: z.enum(["m", "f"]).nullable().describe("Noun gender; null for anything that is not a noun"),
      plural: z.string().nullable().describe("Plural with article, only when irregular or useful; else null"),
      forms: z
        .string()
        .nullable()
        .describe("Verbs: 'je …, vous …, passé composé: j'ai …'. Adjectives: 'masc · fem'. Else null"),
      note: z.string().nullable().describe("One short usage note, or null"),
      ipa: z.string().nullable().describe("IPA for France French between slashes, liaison marked ‿"),
      say: z.string().nullable().describe("A short pronunciation hint when there is a trap for this learner, else null"),
      pattern: z.string().nullable().describe("Phrases only: the frame with a slot and two other fillers; else null"),
      example: z
        .object({ fr: z.string(), en: z.string(), zh: z.string().nullable() })
        .describe("A short example sentence using this word"),
    }),
  ),
  sentences: z.array(
    z.object({
      fr: z.string(),
      en: z.string(),
      zh: z.string().nullable(),
      note: z.string().nullable(),
      who: z.enum(["me", "them"]).describe("me = the learner says it, them = the other person says it"),
      say: z.string().nullable(),
    }),
  ),
  tips: z.array(z.object({ title: z.string(), text: z.string() })),
});
export type SectionOut = z.infer<typeof sectionOut>;

export const storyOut = z.object({
  lines: z.array(
    z.object({
      fr: z.string(),
      en: z.string(),
      zh: z.string().nullable(),
      note: z.string().nullable(),
      say: z.string().nullable(),
    }),
  ),
});
export type StoryOut = z.infer<typeof storyOut>;

export const dialogueOut = z.object({
  lines: z.array(
    z.object({
      who: z.enum(["me", "them"]),
      fr: z.string(),
      en: z.string(),
      zh: z.string().nullable(),
      note: z.string().nullable(),
      say: z.string().nullable(),
    }),
  ),
});
export type DialogueOut = z.infer<typeof dialogueOut>;

/** Gentle feedback on a sentence the learner wrote ("Your turn"). */
export const feedbackOut = z.object({
  ok: z.boolean().describe("true if a person in France would understand it and it has no real mistake"),
  fixed: z.string().describe("The sentence corrected, keeping the learner's words; identical if nothing is wrong"),
  en: z.string().describe("The meaning of the fixed sentence in the explanation language"),
  note: z.string().nullable().describe("At most two short points, praise first; null if nothing to say"),
  natural: z.string().nullable().describe("What a native would more naturally say, only if different from fixed"),
});
export type FeedbackOut = z.infer<typeof feedbackOut>;

export const checkOut = z.object({
  issues: z.array(
    z.object({
      id: z.string().describe("The id of the line with a problem, exactly as given"),
      problem: z.string().describe("What is wrong, in one short sentence in the explanation language"),
      suggestion: z.string().nullable().describe("The corrected French text for that field, or null"),
    }),
  ),
});
export type CheckOut = z.infer<typeof checkOut>;

export const questionsOut = z.object({
  questions: z.array(z.string()).describe("Up to 3 short questions"),
});

// ---------- helpers ----------

export function newId(prefix: string): string {
  return prefix + Math.random().toString(36).slice(2, 10);
}

/** Turn AI section output into stored section data with ids. */
export function toSectionData(out: SectionOut): SectionData {
  return sectionDataSchema.parse({
    words: out.words.map((w) => ({
      ...w,
      id: newId("w"),
      gender: w.type === "noun" ? w.gender : null,
      flag: null,
    })),
    sentences: out.sentences.map((s) => ({ ...s, id: newId("s"), flag: null })),
    tips: out.tips.map((t) => ({ ...t, id: newId("t") })),
  });
}

export function toStoryLines(out: StoryOut): StoryLine[] {
  return out.lines.map((l) => storyLineSchema.parse({ ...l, id: newId("r"), flag: null }));
}

export function toDialogueLines(out: DialogueOut): DialogueLine[] {
  return out.lines.map((l) => dialogueLineSchema.parse({ ...l, id: newId("d"), flag: null }));
}

export function toNextTime(out: OutlineOut["nextTime"]): NextTimeLine[] {
  return out.slice(0, 5).map((l) => nextTimeSchema.parse({ ...l, id: newId("n") }));
}

/** Every French line in a topic that can have a recording, in reading order. */
export function frenchLines(
  sections: { data: SectionData }[],
  story: StoryLine[],
  dialogue: DialogueLine[] = [],
  nextTime: NextTimeLine[] = [],
): string[] {
  const out: string[] = [];
  for (const s of sections) {
    for (const w of s.data.words) {
      out.push(w.fr);
      if (w.example) out.push(w.example.fr);
    }
    for (const x of s.data.sentences) out.push(x.fr);
  }
  for (const l of story) out.push(l.fr);
  for (const l of dialogue) out.push(l.fr);
  for (const l of nextTime) out.push(l.fr);
  return [...new Set(out.map((t) => t.trim()).filter(Boolean))];
}
