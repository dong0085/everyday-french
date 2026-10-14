import { describe, expect, it } from "vitest";
import { fold, frType, wordCount } from "@/lib/content/french";
import { cleanIpa, coverageProblem, missingCoreWords, ruleChecks, whoProblem } from "@/lib/content/checks";
import { attemptBody, tidyFeedback } from "@/lib/content/feedback";
import {
  INSTRUCTIONS,
  checkPrompt,
  dialoguePrompt,
  feedbackPrompt,
  learnerOf,
  outlinePrompt,
  questionsPrompt,
  sectionPrompt,
  type Learner,
} from "@/lib/content/prompt";
import {
  dialogueOut,
  feedbackOut,
  frenchLines,
  outlineOut,
  questionsOut,
  sectionOut,
  storyOut,
  toDialogueLines,
  toNextTime,
  toSectionData,
  toStoryLines,
  type SectionOut,
} from "@/lib/content/schema";
import { mockOutput } from "@/lib/providers/mock";
import { EXAMPLE } from "@/lib/content/example";
import { dialogueLineSchema, nextTimeSchema, sectionDataSchema, storyLineSchema } from "@/lib/content/schema";

type OutWord = SectionOut["words"][number];
const word = (fr: string, type: OutWord["type"], extra: Partial<OutWord> = {}): OutWord => ({
  fr,
  en: "…",
  zh: null,
  type,
  core: true,
  gender: type === "noun" ? "m" : null,
  plural: null,
  forms: null,
  note: null,
  ipa: null,
  say: null,
  pattern: null,
  example: { fr: "Bonjour.", en: "Hello.", zh: null },
  ...extra,
});
const sentence = (fr: string, who: "me" | "them" = "me") => ({ fr, en: "…", zh: null, note: null, who, say: null });

describe("french helpers", () => {
  it("adds non-breaking spaces before ? ! : ;", () => expect(frType("C'est combien ?")).toBe("C'est combien\u00a0?"));
  it("folds accents for search", () => expect(fold("Électricité Œuvre")).toBe("electricite oeuvre"));
  it("counts words with elision", () => expect(wordCount("J'ai cherché une voiture.")).toBe(4));
});

describe("ruleChecks", () => {
  const data = toSectionData({
    words: [
      word("voiture", "noun", { gender: "f", example: { fr: "Je ai une voiture.", en: "I have a car.", zh: null } }),
      word("le moteur", "noun", { example: { fr: "Le moteur est bon.", en: "The engine is good.", zh: null } }),
    ],
    sentences: [
      sentence("Je suis allé chez le vendeur avec mon frère et nous avons regardé la voiture pendant une heure."),
      sentence("Vous avez choisi ?", "me"),
      sentence("Je voudrais un café.", "me"),
    ],
    tips: [],
  });
  const issues = ruleChecks("A1", [{ data }], []);
  it("flags a noun without article", () => expect(issues.some((i) => i.problem.includes("article"))).toBe(true));
  it("flags missing elision", () => expect(issues.some((i) => i.problem.includes("elision"))).toBe(true));
  it("flags long sentences for the level", () => expect(issues.some((i) => i.problem.includes("Long sentence"))).toBe(true));
  it("leaves correct words alone", () => expect(issues.some((i) => i.id === data.words[1].id)).toBe(false));
  it("flags a staff line marked as mine", () => expect(issues.some((i) => i.id === data.sentences[1].id && i.problem.includes("other person"))).toBe(true));
  it("leaves a learner line alone", () => expect(issues.some((i) => i.id === data.sentences[2].id)).toBe(false));
  it("checks dialogue lines too", () => {
    const lines = toDialogueLines({ lines: [{ ...sentence("Ça fera 4 €.", "me") }, { ...sentence("Ça fera 4 €.", "them") }] });
    const found = ruleChecks("A2", [], [], lines);
    expect(found.map((i) => i.id)).toEqual([lines[0].id]);
  });
});

describe("whoProblem", () => {
  it("only looks at me lines", () => expect(whoProblem("Vous désirez ?", "them")).toBeNull());
  it("ignores accents and leading punctuation", () => expect(whoProblem("« Vous désirez autre chose ? »", "me")).not.toBeNull());
  it("lets the learner ask about a price", () => expect(whoProblem("Ça fait combien ?", "me")).toBeNull());
});

describe("cleanIpa", () => {
  it("keeps good IPA", () => expect(cleanIpa("/ɛ̃ kʁwasɑ̃/")).toBe("/ɛ̃ kʁwasɑ̃/"));
  it("keeps liaison marks", () => expect(cleanIpa("/vuz‿ave/")).toBe("/vuz‿ave/"));
  it("accepts brackets and drops stress marks", () => expect(cleanIpa("[ˈkafe]")).toBe("/kafe/"));
  it("writes r as ʁ", () => expect(cleanIpa("/pri/")).toBe("/pʁi/"));
  it("drops romanisation", () => expect(cleanIpa("kroo-sahn")).toBeNull());
  it("drops English IPA symbols", () => expect(cleanIpa("/θɪŋk/")).toBeNull());
  it("drops text without slashes that is not IPA", () => expect(cleanIpa("croissant (French)")).toBeNull());
  it("drops empty values", () => {
    expect(cleanIpa(null)).toBeNull();
    expect(cleanIpa("//")).toBeNull();
  });
});

describe("My story coverage", () => {
  const data = toSectionData({
    words: [
      word("le kilométrage", "noun"),
      word("les freins", "noun"),
      word("payer", "verb"),
      word("prendre", "verb"),
      word("l'addition", "noun", { gender: "f" }),
      word("neuf", "adj"),
      word("d'occasion", "adj"),
      word("la carte grise", "noun", { gender: "f" }),
      word("C'est combien ?", "phrase"),
      word("le vendeur", "noun"),
    ],
    sentences: [],
    tips: [],
  });
  const story = [
    { fr: "J'ai regardé le KILOMETRAGE et le frein." },
    { fr: "J'ai payé par carte et j'ai pris l'addition." },
    { fr: "La voiture était neuve, enfin presque : d'occasion." },
  ];
  const missing = missingCoreWords([{ data }], story);
  it("matches accents, plurals, conjugations and irregular participles", () =>
    expect(missing).toEqual(["la carte grise", "le vendeur"]));
  it("does not count phrases", () => expect(missing).not.toContain("C'est combien ?"));
  it("writes a note only when words are missing", () => {
    expect(coverageProblem([])).toBeNull();
    expect(coverageProblem(missing)).toBe("Core words not used in My story: la carte grise, le vendeur.");
  });
});

describe("prompts", () => {
  const l: Learner = { level: "A1", explainLang: "en", selfGender: "f", zhGloss: false, l1: "zh" };
  it("INSTRUCTIONS has no per-call data", () => {
    expect(INSTRUCTIONS).not.toContain("${");
    expect(INSTRUCTIONS).not.toMatch(/undefined|null,/);
  });
  it("learnerOf reads the first language", () => {
    expect(learnerOf({ level: "A2", explain_lang: "zh", self_gender: "f", zh_gloss: true, l1: "zh" }).l1).toBe("zh");
    expect(learnerOf({ level: "A2", explain_lang: "en", self_gender: "x", zh_gloss: false }).l1).toBe("other");
  });
  it("the learner block names the first language", () => expect(questionsPrompt(l, "Hier…")).toContain("- First language: Chinese (Mandarin)"));
  it("questions ask what was said to the learner", () => expect(questionsPrompt(l, "Hier…")).toContain("what was said to them"));
  it("the outline uses the level's section count and known words", () => {
    const p = outlinePrompt(l, "Hier…", null, ["un café", "Je voudrais…"]);
    expect(p).toContain("3–4 sections");
    expect(p).toContain("WORDS THE LEARNER ALREADY HAS (from earlier topics): un café, Je voudrais…");
    expect(p).toContain('"nextTime"');
    expect(outlinePrompt(l, "Hier…")).not.toContain("ALREADY HAS");
  });
  it("sections ask for who, pattern and ipa", () => {
    const p = sectionPrompt(l, "Hier…", null, { title: "T", story: "S", sections: [{ slug: "a", titleFr: "A", title: "A", coreWords: ["un café"] }] }, "a");
    expect(p).toMatch(/"who": "me"/);
    expect(p).toContain('"pattern"');
    expect(p).toContain('"ipa"');
  });
  it("dialogue length follows the level", () => expect(dialoguePrompt(l, { title: "T", story: "S" }, ["un café"], [])).toContain("6–8 lines"));
  it("feedback quotes the attempt", () =>
    expect(feedbackPrompt(l, { topicTitle: "T", sectionTitleFr: null, target: [] }, "je ai faim")).toContain('"""\nje ai faim\n"""'));
  it("the review lists ids", () => expect(checkPrompt(l, [{ id: "d1", field: "fr", fr: "Bonjour", extra: "said by: me" }])).toContain("d1 [fr] Bonjour (said by: me)"));
});

describe("feedback", () => {
  it("validates the attempt body", () => {
    expect(attemptBody.safeParse({ sectionId: null, text: "  Je voudrais un café. ", save: true }).success).toBe(true);
    expect(attemptBody.safeParse({ sectionId: null, text: "   ", save: true }).success).toBe(false);
    expect(attemptBody.safeParse({ sectionId: "nope", text: "Bonjour", save: false }).success).toBe(false);
    expect(attemptBody.safeParse({ sectionId: null, text: "a".repeat(401), save: false }).success).toBe(false);
    expect(attemptBody.safeParse({ text: "Bonjour", save: false }).success).toBe(false);
  });
  it("tidies the AI's answer", () => {
    const f = tidyFeedback({ ok: false, fixed: "  ", en: " I am hungry ", note: "", natural: "J'ai faim." }, "J'ai faim.");
    expect(f).toEqual({ ok: false, fixed: "J'ai faim.", en: "I am hungry", note: null, natural: null });
  });
});

describe("mock provider", () => {
  const prompt = (stage: string) => `- Learner's gender for agreement: feminine (elle)\n${stage}`;
  it("every stage validates", () => {
    const outline = outlineOut.parse(mockOutput("outline", ""));
    expect(toNextTime(outline.nextTime)).toHaveLength(3);
    expect(questionsOut.parse(mockOutput("questions", "")).questions.length).toBeGreaterThan(0);
    const story = toStoryLines(storyOut.parse(mockOutput("story", prompt(""))));
    expect(story.some((x) => x.fr === "Je suis allée chez le vendeur.")).toBe(true);
    const dialogue = toDialogueLines(dialogueOut.parse(mockOutput("dialogue", "")));
    expect(dialogue.every((x) => x.id.startsWith("d") && x.who)).toBe(true);
    for (const s of outline.sections) {
      const data = toSectionData(sectionOut.parse(mockOutput("section", `WRITE ONE SECTION — "${s.titleFr}"`)));
      expect(data.words.every((w) => w.id.startsWith("w") && cleanIpa(w.ipa) === w.ipa)).toBe(true);
      expect(data.sentences.every((x) => x.who)).toBe(true);
      expect(ruleChecks("A1", [{ data }], [], dialogue)).toEqual([]);
    }
  });
  it("the mock story uses every core word", () => {
    const outline = outlineOut.parse(mockOutput("outline", ""));
    const sections = outline.sections.map((s) => ({ data: toSectionData(sectionOut.parse(mockOutput("section", `WRITE ONE SECTION — "${s.titleFr}"`))) }));
    const story = toStoryLines(storyOut.parse(mockOutput("story", "")));
    expect(missingCoreWords(sections, story)).toEqual([]);
    expect(ruleChecks("A1", [], story)).toEqual([]);
    expect(frenchLines(sections, story).length).toBeGreaterThan(20);
  });
  it("mock feedback corrects elision and validates", () => {
    const p = feedbackPrompt({ level: "A1", explainLang: "en", selfGender: "x", zhGloss: false, l1: "en" }, { topicTitle: "T", sectionTitleFr: null, target: [] }, "je ai cherché une voiture");
    const f = feedbackOut.parse(mockOutput("feedback", p));
    expect(f.ok).toBe(false);
    expect(f.fixed).toBe("J'ai cherché une voiture.");
    const good = feedbackOut.parse(mockOutput("feedback", p.replace("je ai cherché une voiture", "J'ai cherché une voiture.")));
    expect(good.ok).toBe(true);
  });
});

describe("example topic", () => {
  const sections = EXAMPLE.sections.map((d) => ({ data: sectionDataSchema.parse(d) }));
  it("is valid stored content", () => {
    EXAMPLE.story.forEach((x) => storyLineSchema.parse(x));
    EXAMPLE.dialogue.forEach((x) => dialogueLineSchema.parse(x));
    EXAMPLE.nextTime.forEach((x) => nextTimeSchema.parse(x));
    expect(EXAMPLE.nextTime).toHaveLength(3);
    expect(EXAMPLE.dialogue.length).toBeGreaterThanOrEqual(6);
  });
  it("passes the rule checks and story coverage", () => {
    expect(ruleChecks("A2", sections, EXAMPLE.story, EXAMPLE.dialogue)).toEqual([]);
    expect(missingCoreWords(sections, EXAMPLE.story)).toEqual([]);
  });
  it("has clean IPA on every word and who on every sentence", () => {
    for (const s of sections) {
      expect(s.data.words.every((w) => w.ipa && cleanIpa(w.ipa) === w.ipa)).toBe(true);
      expect(s.data.sentences.every((x) => x.who)).toBe(true);
    }
  });
  it("marks direct speech in My story", () => expect(EXAMPLE.story.some((l) => l.fr.startsWith("J'ai dit : «"))).toBe(true));
});
