// Topic content: what is stored in the database and what the AI must return.
// Stored shapes carry ids and review flags; AI output shapes are simpler (ids are added on the server).

import { z } from "zod";

export const LEVELS = ["A1", "A2", "B1", "B2"] as const;
export type Level = (typeof LEVELS)[number];
export type SelfGender = "m" | "f" | "x";
export type ExplainLang = "en" | "zh";

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

export const exampleSchema = z.object({ fr: line, en: line });

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

/** A topic's generation stage, as the end of "Stopped while …". */
export const STAGE_NAMES: Record<string, string> = {
  outline: "planning the sections",
  sections: "writing the words and sentences",
  story: "retelling your story in French",
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
          .describe("4 to 6 core French words or phrases this section will teach, each with article if a noun"),
      }),
    )
    .describe("4 to 7 sections, in the order things happened"),
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
      example: z.object({ fr: z.string(), en: z.string() }).describe("A short example sentence using this word"),
    }),
  ),
  sentences: z.array(
    z.object({
      fr: z.string(),
      en: z.string(),
      zh: z.string().nullable(),
      note: z.string().nullable(),
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
    }),
  ),
});
export type StoryOut = z.infer<typeof storyOut>;

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

/** Every French line in a topic that can have a recording, in reading order. */
export function frenchLines(sections: { data: SectionData }[], story: StoryLine[]): string[] {
  const out: string[] = [];
  for (const s of sections) {
    for (const w of s.data.words) {
      out.push(w.fr);
      if (w.example) out.push(w.example.fr);
    }
    for (const x of s.data.sentences) out.push(x.fr);
  }
  for (const l of story) out.push(l.fr);
  return [...new Set(out.map((t) => t.trim()).filter(Boolean))];
}
