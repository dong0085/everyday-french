// Prompts for every generation stage.
// INSTRUCTIONS stays byte-identical across calls so provider prompt caching works;
// everything that changes (level, story, language) goes in the per-call prompt.

import type { ExplainLang, Level, SelfGender } from "./schema";

export type Learner = {
  level: Level;
  explainLang: ExplainLang;
  selfGender: SelfGender;
  zhGloss: boolean;
};

export const INSTRUCTIONS = `You write French study material for an adult learner, based on something that really happened to them.
The learner studies standard French as spoken in France. Everything you write must be correct, natural French that a person in France would actually say.

LEVEL RULES
- A1: sentences of 4–8 words. Tenses: présent, passé composé, futur proche, plus the fixed forms "c'était", "il y avait", "je voulais". Very common words, plus the practical words this situation needs.
- A2: sentences of 5–10 words. Adds imparfait for background and description.
- B1: sentences up to 14 words. Adds conditionnel, plus-que-parfait, "il faut que" + subjonctif.
- B2: natural sentences up to 18 words, any common tense. Never passé simple at any level.

FRENCH RULES
1. Every noun has an article (le, la, l', un, une) and a gender. Use the real gender.
2. Elision and contractions are always correct: j'ai, l'hôpital, qu'il, au, du, aux, des. Accents are mandatory.
3. Questions use "est-ce que" or rising intonation ("C'est combien ?"). No inversion at A1–A2.
4. Write the full negation "ne … pas". A note may say that speech often drops "ne".
5. Register: "vous" with strangers, staff and officials; "tu" with friends and family. "on" is fine with a short note.
6. Past participles in sentences about the learner ("je") agree with the learner's gender as given. If the gender is not set, use the masculine form.
7. No anglicisms unless people in France really use them. Numbers and prices in French format (15 000 €, 3,5 %), dates in French order.
8. French text contains only French. Meanings and notes are written only in the explanation language. No pinyin, no romanisation.
9. Use the learner's real details (places, prices, people, what they did) so the material is about their life. Facts about how things work in France must stay correct; if the story happened outside France, the sentences describe what the learner did, and tips explain how it works in France.

TEACHING RULES
- Teach useful chunks, not only single words: each section has 2–3 phrases (type "phrase") the learner can say as a whole, e.g. "Je voudrais…", "C'est combien ?", "Est-ce que je peux… ?".
- Verbs: "fr" is the infinitive; "forms" gives the je and vous present and the passé composé with its auxiliary, e.g. "je cherche, vous cherchez · passé composé : j'ai cherché". Verbs with être show it: "je suis allé(e)".
- Adjectives: "forms" gives masculine · feminine, e.g. "neuf · neuve".
- Every word gets one short example sentence that fits the story.
- Translations are natural, not word for word. Mention false friends (actuellement, librairie, assister…) in the note.
- Tips are about using the language or how things work in France ("Say bonjour before asking anything"), never grammar tables.
- If you are unsure a line is natural French, choose a simpler line you are sure of.`;

const LANG_NAME: Record<ExplainLang, string> = { en: "English", zh: "Simplified Chinese" };
const GENDER: Record<SelfGender, string> = {
  m: "masculine (il)",
  f: "feminine (elle)",
  x: "not set — use masculine forms",
};

const TARGETS: Record<Level, { words: string; core: string; story: string; tips: string }> = {
  A1: { words: "3–5 words per section", core: "3–4", story: "8–12 lines", tips: "exactly 1 tip" },
  A2: { words: "5–7 words per section", core: "4–5", story: "9–13 lines", tips: "1 or 2 tips" },
  B1: { words: "6–8 words per section", core: "4–6", story: "10–15 lines", tips: "1 or 2 tips" },
  B2: { words: "6–9 words per section", core: "4–6", story: "10–15 lines", tips: "1 or 2 tips" },
};

function learnerBlock(l: Learner): string {
  return [
    `LEARNER`,
    `- Level: ${l.level}`,
    `- Explanation language: ${LANG_NAME[l.explainLang]}`,
    `- Learner's gender for agreement: ${GENDER[l.selfGender]}`,
    `- Chinese gloss ("zh" fields): ${l.zhGloss ? "yes, a short Simplified Chinese gloss" : "no, always null"}`,
  ].join("\n");
}

function storyBlock(source: string, answers?: { question: string; answer: string }[] | null): string {
  const qa = (answers || []).filter((a) => a.answer.trim());
  return [
    `WHAT HAPPENED (the learner's own words, any language):`,
    `"""`,
    source.trim(),
    `"""`,
    ...(qa.length ? [`ANSWERS TO FOLLOW-UP QUESTIONS:`, ...qa.map((a) => `- ${a.question} → ${a.answer}`)] : []),
  ].join("\n");
}

export function questionsPrompt(l: Learner, source: string): string {
  return `${learnerBlock(l)}

${storyBlock(source)}

TASK
Ask up to 3 short questions (in ${LANG_NAME[l.explainLang]}) whose answers would make the French material more personal and useful.
Good questions ask what the learner actually said, heard, paid, or decided. Skip anything already clear. Return an empty list if the story is already complete.`;
}

export function outlinePrompt(l: Learner, source: string, answers?: { question: string; answer: string }[] | null): string {
  const t = TARGETS[l.level];
  return `${learnerBlock(l)}

${storyBlock(source, answers)}

TASK: OUTLINE
Plan a topic about this experience.
- 4–7 sections in the order things happened (e.g. searching, contacting, visiting, negotiating, paperwork).
- For each section, choose its core words (${t.core}): the French words and phrases the learner most needs for that step. Include 1–2 phrases among them. No word may appear in two sections.
- "story" retells the experience clearly in ${LANG_NAME[l.explainLang]}, first person.
- "genderNote": if any "je" sentence will need a participle that changes with gender (e.g. je suis allé / allée), one short note about it; else null.`;
}

export function sectionPrompt(
  l: Learner,
  source: string,
  answers: { question: string; answer: string }[] | null,
  outline: { title: string; story: string; sections: { slug: string; titleFr: string; title: string; coreWords: string[] }[] },
  slug: string,
  extraRequest?: string | null,
): string {
  const t = TARGETS[l.level];
  const me = outline.sections.find((s) => s.slug === slug)!;
  const others = outline.sections.filter((s) => s.slug !== slug).flatMap((s) => s.coreWords);
  return `${learnerBlock(l)}

${storyBlock(source, answers)}

TOPIC: ${outline.title}
STORY (cleaned up): ${outline.story}
ALL SECTIONS: ${outline.sections.map((s, i) => `${i + 1}. ${s.titleFr} (${s.title})`).join(" · ")}

TASK: WRITE ONE SECTION — "${me.titleFr}" (${me.title})
- Core words for this section (mark them core: true): ${me.coreWords.join(", ")}
- You may add a few extra words (core: false) that this step really needs. Target: ${t.words}, ${t.core} of them core.
- Words owned by other sections — do not include them as entries: ${others.join(", ") || "none"}
- 2–3 of the entries are phrases (type "phrase").
- 2–4 sentences the learner could say or hear at this step, first person where it fits, each using at least one core word.
- ${t.tips}.${extraRequest ? `\n- The learner also asked: "${extraRequest}". Include what they asked for.` : ""}`;
}

export function storyPrompt(
  l: Learner,
  source: string,
  answers: { question: string; answer: string }[] | null,
  outline: { title: string; story: string },
  coreWords: string[],
  phrases: string[],
): string {
  return `${learnerBlock(l)}

${storyBlock(source, answers)}

STORY (cleaned up): ${outline.story}

TASK: "MY STORY"
Retell the learner's experience in simple French, first person, past tense, in ${TARGETS[l.level].story}, one sentence per line, in the order it happened.
- Use every one of these core words at least once: ${coreWords.join(", ")}
- Reuse these phrases where they fit: ${phrases.join(", ") || "none"}
- Participle agreement follows the learner's gender as given.
- "en" is the meaning in the explanation language.`;
}

export function checkPrompt(l: Learner, lines: { id: string; field: string; fr: string; en?: string; extra?: string }[]): string {
  return `${learnerBlock(l)}

TASK: REVIEW
You are a careful French teacher from France. Check each line below for real mistakes:
gender and article, agreement (including the learner's gender in "je" sentences), elision and contractions, accents, spelling, verb forms and auxiliaries, tenses allowed at ${l.level}, register (vous with strangers), unnatural or non-France wording, anglicisms, wrong translation.
Report only lines with a real problem. For each, give its id exactly as shown, the problem in ${LANG_NAME[l.explainLang]}, and the corrected French text of the field named in brackets (or null if only the translation is wrong).
If every line is fine, return an empty list.

LINES
${lines.map((x) => `${x.id} [${x.field}] ${x.fr}${x.en ? ` = ${x.en}` : ""}${x.extra ? ` (${x.extra})` : ""}`).join("\n")}`;
}
