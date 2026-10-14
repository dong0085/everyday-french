import { describe, expect, it } from "vitest";
import { fold, frType, wordCount } from "@/lib/content/french";
import { ruleChecks } from "@/lib/content/checks";
import { frenchLines, sectionOut, toSectionData } from "@/lib/content/schema";
import { mockOutput } from "@/lib/providers/mock";

describe("french helpers", () => {
  it("adds non-breaking spaces before ? ! : ;", () => expect(frType("C'est combien ?")).toBe("C'est combien ?"));
  it("folds accents for search", () => expect(fold("Électricité Œuvre")).toBe("electricite oeuvre"));
  it("counts words with elision", () => expect(wordCount("J'ai cherché une voiture.")).toBe(4));
});

describe("ruleChecks", () => {
  const data = toSectionData({
    words: [
      { fr: "voiture", en: "car", zh: null, type: "noun", core: true, gender: "f", plural: null, forms: null, note: null, example: { fr: "Je ai une voiture.", en: "I have a car." } },
      { fr: "le moteur", en: "engine", zh: null, type: "noun", core: true, gender: "m", plural: null, forms: null, note: null, example: { fr: "Le moteur est bon.", en: "The engine is good." } },
    ],
    sentences: [{ fr: "Je suis allé chez le vendeur avec mon frère et nous avons regardé la voiture pendant une heure.", en: "…", zh: null, note: null }],
    tips: [],
  });
  const issues = ruleChecks("A1", [{ data }], []);
  it("flags a noun without article", () => expect(issues.some((i) => i.problem.includes("article"))).toBe(true));
  it("flags missing elision", () => expect(issues.some((i) => i.problem.includes("elision"))).toBe(true));
  it("flags long sentences for the level", () => expect(issues.some((i) => i.problem.includes("Long sentence"))).toBe(true));
  it("leaves correct words alone", () => expect(issues.some((i) => i.id === data.words[1].id)).toBe(false));
});

describe("schemas", () => {
  it("mock section output validates and gets ids", () => {
    const out = sectionOut.parse(mockOutput("section", 'WRITE ONE SECTION — "Chercher en ligne"'));
    const data = toSectionData(out);
    expect(data.words.every((w) => w.id.startsWith("w"))).toBe(true);
    expect(frenchLines([{ data }], []).length).toBeGreaterThan(data.words.length);
  });
});
