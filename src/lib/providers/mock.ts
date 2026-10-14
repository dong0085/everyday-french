// A fake provider so the whole app can be tested end to end without spending credits.
// Enabled only when ALLOW_MOCK_PROVIDERS=1, and never on the production deployment.
import type { Stage } from "./llm";

export function mockAllowed(): boolean {
  return process.env.ALLOW_MOCK_PROVIDERS === "1" && process.env.VERCEL_ENV !== "production";
}

const SECTIONS = [
  { slug: "chercher", title: "Searching online", titleFr: "Chercher en ligne", core: ["une annonce", "chercher", "d'occasion", "le kilométrage"] },
  { slug: "contacter", title: "Contacting the seller", titleFr: "Contacter le vendeur", core: ["le vendeur", "appeler", "Est-ce qu'elle est toujours disponible ?"] },
  { slug: "essayer", title: "The test drive", titleFr: "L'essai", core: ["faire un essai", "le moteur", "les freins"] },
  { slug: "acheter", title: "Buying", titleFr: "Acheter", core: ["le prix", "négocier", "la carte grise"] },
];

const WORDS: Record<string, { en: string; type: string; gender: "m" | "f" | null; forms?: string }> = {
  "une annonce": { en: "a listing", type: "noun", gender: "f" },
  chercher: { en: "to look for", type: "verb", gender: null, forms: "je cherche, vous cherchez · passé composé : j'ai cherché" },
  "d'occasion": { en: "used, second-hand", type: "adj", gender: null },
  "le kilométrage": { en: "the mileage", type: "noun", gender: "m" },
  "le vendeur": { en: "the seller", type: "noun", gender: "m" },
  appeler: { en: "to call", type: "verb", gender: null, forms: "j'appelle, vous appelez · passé composé : j'ai appelé" },
  "Est-ce qu'elle est toujours disponible ?": { en: "Is it still available?", type: "phrase", gender: null },
  "faire un essai": { en: "to take a test drive", type: "phrase", gender: null },
  "le moteur": { en: "the engine", type: "noun", gender: "m" },
  "les freins": { en: "the brakes", type: "noun", gender: "m" },
  "le prix": { en: "the price", type: "noun", gender: "m" },
  négocier: { en: "to negotiate", type: "verb", gender: null, forms: "je négocie, vous négociez · passé composé : j'ai négocié" },
  "la carte grise": { en: "the registration document", type: "noun", gender: "f" },
};

export function mockOutput(stage: Stage, prompt: string): unknown {
  switch (stage) {
    case "questions":
      return { questions: ["Where did you find the car?", "How much did you pay?"] };
    case "outline":
      return {
        title: "Buying a used car",
        titleFr: "Acheter une voiture d'occasion",
        summary: "Words and sentences for finding, testing and buying a used car.",
        story: "I looked for a used car online, called a seller, took a test drive and bought it.",
        genderNote: "A woman writes « je suis allée » (with an extra e).",
        sections: SECTIONS.map((s) => ({ slug: s.slug, title: s.title, titleFr: s.titleFr, intro: `About: ${s.title.toLowerCase()}.`, coreWords: s.core })),
      };
    case "section": {
      const s = SECTIONS.find((x) => prompt.includes(`"${x.titleFr}"`)) ?? SECTIONS[0];
      return {
        words: s.core.map((fr) => ({
          fr,
          en: WORDS[fr]?.en ?? "meaning",
          zh: null,
          type: WORDS[fr]?.type ?? "other",
          core: true,
          gender: WORDS[fr]?.gender ?? null,
          plural: null,
          forms: WORDS[fr]?.forms ?? null,
          note: null,
          example: { fr: `J'ai parlé de ${fr.replace(/ \?$/, "")}.`, en: `I talked about ${WORDS[fr]?.en ?? "it"}.` },
        })),
        sentences: [
          { fr: "Je cherche une voiture d'occasion.", en: "I'm looking for a used car.", zh: null, note: null },
          { fr: "C'est combien ?", en: "How much is it?", zh: null, note: null },
        ],
        tips: [{ title: "Leboncoin", text: "Most private used-car listings in France are on *Leboncoin*." }],
      };
    }
    case "story":
      return {
        lines: [
          { fr: "J'ai cherché une voiture d'occasion.", en: "I looked for a used car.", zh: null, note: null },
          { fr: "J'ai appelé le vendeur.", en: "I called the seller.", zh: null, note: null },
          { fr: "J'ai fait un essai.", en: "I took a test drive.", zh: null, note: null },
          { fr: "J'ai négocié le prix.", en: "I negotiated the price.", zh: null, note: null },
        ],
      };
    case "check": {
      const first = prompt.match(/^(s[a-z0-9]+) \[fr\] (.+?)(?: = |$)/m);
      return {
        issues: first ? [{ id: first[1], problem: "Mock review: this line was flagged for testing.", suggestion: first[2] }] : [],
      };
    }
  }
}

/** ~0.25 s of silent MPEG-1 Layer III (128 kbps, 44.1 kHz). */
export function silentMp3(): Uint8Array {
  const frame = new Uint8Array(417);
  frame.set([0xff, 0xfb, 0x90, 0x64]);
  const out = new Uint8Array(frame.length * 10);
  for (let i = 0; i < 10; i++) out.set(frame, i * frame.length);
  return out;
}

export const MOCK_TRANSCRIPT = "Je cherchais une voiture d'occasion. I found one on Leboncoin and called the seller.";
