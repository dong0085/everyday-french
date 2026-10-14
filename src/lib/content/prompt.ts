// Prompts for every generation stage.
// INSTRUCTIONS stays byte-identical across calls so provider prompt caching works;
// everything that changes (level, first language, story, known words) goes in the per-call prompt.

import type { ExplainLang, L1, Level, SelfGender } from "./schema";

export type Learner = {
  level: Level;
  explainLang: ExplainLang;
  selfGender: SelfGender;
  zhGloss: boolean;
  l1: L1;
};

/** The learner settings saved on a topic row (or a profile row: the columns have the same names). */
export function learnerOf(t: { level: string; explain_lang: string; self_gender: string; zh_gloss: boolean; l1?: string | null }): Learner {
  return {
    level: t.level as Level,
    explainLang: t.explain_lang === "zh" ? "zh" : "en",
    selfGender: (["m", "f"].includes(t.self_gender) ? t.self_gender : "x") as SelfGender,
    zhGloss: t.zh_gloss,
    l1: t.l1 === "zh" || t.l1 === "en" ? t.l1 : "other",
  };
}

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
9. Pronunciation goes only in the "ipa" field: standard IPA for France French between slashes, no stress marks, liaison marked ‿ after the linking consonant, three nasal vowels ("un" is /ɛ̃/). Examples: "un croissant" /ɛ̃ kʁwasɑ̃/, "vous avez" /vuz‿ave/, "un ami" /ɛ̃n‿ami/.
10. Use the learner's real details (places, prices, people, what they did) so the material is about their life. Facts about how things work in France must stay correct; if the story happened outside France, the sentences describe what the learner did, and tips explain how it works in France.

TEACHING RULES
- Teach useful chunks, not only single words: each section has 2–3 phrases (type "phrase") the learner can say as a whole, e.g. "Je voudrais…", "C'est combien ?", "Est-ce que je peux… ?".
- A phrase is a frame with a slot. Its "pattern" writes the frame with … for the slot, then → and two other fillers, e.g. "Je voudrais … → un café · l'addition" or "Est-ce que je peux … ? → payer par carte · m'asseoir ici". Null for a phrase with no slot.
- Verbs: "fr" is the infinitive; "forms" gives the je and vous present and the passé composé with its auxiliary, e.g. "je cherche, vous cherchez · passé composé : j'ai cherché". Verbs with être show it: "je suis allé(e)".
- Adjectives: "forms" gives masculine · feminine, e.g. "neuf · neuve".
- Every word gets one short example sentence that fits the story: a line the learner would say or hear in that situation, not a general statement about the word.
- Where a step is an exchange, sentences come in pairs: what the other person says ("who": "them"), then what the learner answers ("who": "me"). Lines the learner says are what they would say in the moment, mostly in the present or futur proche, because that is what they need next time; telling the past belongs to "My story".
- Translations are natural, not word for word.
- Notes point out what the learner's first language (given with the learner) does not mark and French does: articles and gender, plural, agreement, tense endings, "du / de la", word order, liaison, silent letters. Mention false friends only when they exist for that first language.
- "say" is a pronunciation hint in the explanation language, only when the line has a trap for this learner (liaison, a silent final letter, a nasal vowel, u vs ou, the French r, h muet, e muet). One short clause, e.g. "the s of vous is said z and joins avez". Otherwise null.
- Tips are about using the language or how things work in France ("Say bonjour before asking anything"), never grammar tables.
- If you are unsure a line is natural French, choose a simpler line you are sure of.`;

const LANG_NAME: Record<ExplainLang, string> = { en: "English", zh: "Simplified Chinese" };
const L1_NAME: Record<L1, string> = { zh: "Chinese (Mandarin)", en: "English", other: "not given" };
const GENDER: Record<SelfGender, string> = {
  m: "masculine (il)",
  f: "feminine (elle)",
  x: "not set — use masculine forms",
};

// Per-section counts chosen so a topic lands in the totals of docs/PLAN.md:
// A1 3–4 sections × 6–7 words ≈ 18–28 words, A2 4–5 × 6–8 ≈ 25–40, B1/B2 ≈ 30–45.
const TARGETS: Record<Level, { sections: string; words: string; core: string; sentences: string; story: string; tips: string; dialogue: string }> = {
  A1: { sections: "3–4 sections", words: "6–7 words per section", core: "3–4", sentences: "3–4 sentences", story: "8–12 lines", tips: "exactly 1 tip", dialogue: "6–8 lines" },
  A2: { sections: "4–5 sections", words: "6–8 words per section", core: "4–5", sentences: "3–5 sentences", story: "9–13 lines", tips: "1 or 2 tips", dialogue: "8–10 lines" },
  B1: { sections: "4–6 sections", words: "6–8 words per section", core: "4–6", sentences: "3–5 sentences", story: "10–15 lines", tips: "1 or 2 tips", dialogue: "10–12 lines" },
  B2: { sections: "4–7 sections", words: "5–7 words per section", core: "4–6", sentences: "3–5 sentences", story: "10–15 lines", tips: "1 or 2 tips", dialogue: "10–14 lines" },
};

/** How many core words + phrases from earlier topics go in a prompt (≈ 300 tokens). */
export const KNOWN_WORDS_MAX = 80;

function learnerBlock(l: Learner): string {
  return [
    `LEARNER`,
    `- Level: ${l.level}`,
    `- First language: ${L1_NAME[l.l1]}`,
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

/** Words the learner met in earlier topics: not taught again as core, but reused. Empty → no block. */
function knownBlock(known: string[] | undefined, task: "outline" | "section"): string {
  const list = (known ?? []).slice(0, KNOWN_WORDS_MAX);
  if (!list.length) return "";
  const rule =
    task === "outline"
      ? `- Do not choose these as core words. Reuse them freely in sentences and in "My story" so they get practised.`
      : `- Do not add these as word entries. Reuse them freely in the sentences and examples so they get practised.`;
  return `\n\nWORDS THE LEARNER ALREADY HAS (from earlier topics): ${list.join(", ")}\n${rule}`;
}

export function questionsPrompt(l: Learner, source: string): string {
  return `${learnerBlock(l)}

${storyBlock(source)}

TASK
Ask up to 3 short questions (in ${LANG_NAME[l.explainLang]}) whose answers would make the French material more personal and useful.
Good questions ask what the learner actually said, what was said to them (in any language), what they paid, or what they decided. At least one question should ask what the other person said, if that is not already clear. Skip anything already clear. Return an empty list if the story is already complete.`;
}

export function outlinePrompt(
  l: Learner,
  source: string,
  answers?: { question: string; answer: string }[] | null,
  known?: string[],
): string {
  const t = TARGETS[l.level];
  return `${learnerBlock(l)}

${storyBlock(source, answers)}${knownBlock(known, "outline")}

TASK: OUTLINE
Plan a topic about this experience.
- ${t.sections} in the order things happened (e.g. searching, contacting, visiting, negotiating, paperwork).
- For each section, choose its core words (${t.core}): the French words and phrases the learner most needs for that step. Include 1–2 phrases among them. No word may appear in two sections.
- "story" retells the experience clearly in ${LANG_NAME[l.explainLang]}, first person.
- "genderNote": if any "je" sentence will need a participle that changes with gender (e.g. je suis allé / allée), one short note about it; else null.
- "nextTime": 3 short French lines the learner should say the next time this situation happens (present or futur proche, polite register), each with its meaning in "en". These are the lines to practise for real life.`;
}

export function sectionPrompt(
  l: Learner,
  source: string,
  answers: { question: string; answer: string }[] | null,
  outline: { title: string; story: string; sections: { slug: string; titleFr: string; title: string; coreWords: string[] }[] },
  slug: string,
  extraRequest?: string | null,
  known?: string[],
): string {
  const t = TARGETS[l.level];
  const me = outline.sections.find((s) => s.slug === slug)!;
  const others = outline.sections.filter((s) => s.slug !== slug).flatMap((s) => s.coreWords);
  return `${learnerBlock(l)}

${storyBlock(source, answers)}

TOPIC: ${outline.title}
STORY (cleaned up): ${outline.story}
ALL SECTIONS: ${outline.sections.map((s, i) => `${i + 1}. ${s.titleFr} (${s.title})`).join(" · ")}${knownBlock(known, "section")}

TASK: WRITE ONE SECTION — "${me.titleFr}" (${me.title})
- Core words for this section (mark them core: true): ${me.coreWords.join(", ")}
- You may add a few extra words (core: false) that this step really needs. Target: ${t.words}, ${t.core} of them core.
- Words owned by other sections — do not include them as entries: ${others.join(", ") || "none"}
- 2–3 of the entries are phrases (type "phrase"). For each phrase give "pattern" (the frame with … and two other fillers) or null.
- For each word give "ipa"; give "say" only when there is a pronunciation trap for this learner.${l.zhGloss ? `\n- Give "zh" on words, examples and sentences.` : ""}
- ${t.sentences} at this step. Mark each with "who": "me" (the learner says it) or "them" (the other person says it). Where the step is an exchange, give the pair: what they say, then what I answer. Each "me" line uses at least one core word.
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
- Direct speech inside the story is introduced with « J'ai dit : », « Il/Elle m'a dit : » or « Il/Elle m'a demandé : » and put in « » so the learner sees who spoke.
- The last line says what the learner will do or say next time (futur proche), so the story ends looking forward.
- "en" is the meaning in the explanation language. Give "say" on a line only when it has a liaison or silent-letter trap.`;
}

export function dialoguePrompt(l: Learner, outline: { title: string; story: string }, coreWords: string[], phrases: string[]): string {
  return `${learnerBlock(l)}

TOPIC: ${outline.title}
STORY (cleaned up): ${outline.story}

TASK: DIALOGUE
Write the key exchange of this experience as a short dialogue, ${TARGETS[l.level].dialogue}, alternating "them" (the other person: staff, seller, doctor…) and "me" (the learner).
- Register and politeness as the situation demands (vous with staff and strangers).
- Use these core words and phrases where they fit: ${[...coreWords, ...phrases].join(", ") || "none"}
- Level rules apply to every line. "me" lines are what the learner would really say, in the present or futur proche; "them" lines are what they would really hear, including one line the learner might not understand at first (so they learn to recognise it).
- "en" is the meaning in the explanation language. "say" only for liaison or silent-letter traps.`;
}

export function feedbackPrompt(
  l: Learner,
  context: { topicTitle: string; sectionTitleFr: string | null; target: string[] },
  attempt: string,
): string {
  return `${learnerBlock(l)}

TOPIC: ${context.topicTitle}${context.sectionTitleFr ? ` · SECTION: ${context.sectionTitleFr}` : ""}
WORDS TO PRACTISE: ${context.target.join(", ") || "any from this topic"}

TASK: GENTLE FEEDBACK
The learner wrote or said this sentence in French about their own situation:
"""
${attempt}
"""
Reply as a kind teacher from France, in ${LANG_NAME[l.explainLang]}:
- "ok": true if a person in France would understand it and it has no real mistake (ignore missing accents on capitals and punctuation).
- "fixed": the sentence corrected, keeping the learner's meaning and words wherever possible; identical to the attempt if nothing is wrong. If part of it is not in French, "fixed" says it in French and "ok" is false.
- "en": the meaning of "fixed" in ${LANG_NAME[l.explainLang]}.
- "note": at most two short points, the most important first, each naming what changed and why in one clause. Praise first when something is right. Null if nothing to say.
- "natural": one line a native would more naturally say in this situation, only if it differs from "fixed"; else null.
Keep every French line within the level rules. Never mention scores.`;
}

export function checkPrompt(l: Learner, lines: { id: string; field: string; fr: string; en?: string; extra?: string }[]): string {
  return `${learnerBlock(l)}

TASK: REVIEW
You are a careful French teacher from France. Check each line below for real mistakes:
gender and article, agreement (including the learner's gender in "je" sentences), elision and contractions, accents, spelling, verb forms and auxiliaries, tenses allowed at ${l.level}, register (vous with strangers), unnatural or non-France wording, anglicisms, wrong translation, IPA that does not match France French pronunciation, wrong "who" (a line a customer would never say marked "me", or the reverse).
Report only lines with a real problem. For each, give its id exactly as shown, the problem in ${LANG_NAME[l.explainLang]}, and the corrected French text of the field named in brackets (or null if only the translation, the IPA or "who" is wrong; then put the right IPA or speaker in the problem).
If every line is fine, return an empty list.

LINES
${lines.map((x) => `${x.id} [${x.field}] ${x.fr}${x.en ? ` = ${x.en}` : ""}${x.extra ? ` (${x.extra})` : ""}`).join("\n")}`;
}
