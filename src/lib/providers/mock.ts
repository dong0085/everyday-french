// A fake provider so the whole app can be tested end to end without spending credits.
// Enabled only when ALLOW_MOCK_PROVIDERS=1, and never on the production deployment.
// The French is real and correct, so local screens look like a real topic.
import type { Stage } from "./llm";

export function mockAllowed(): boolean {
  return process.env.ALLOW_MOCK_PROVIDERS === "1" && process.env.VERCEL_ENV !== "production";
}

type Line = { fr: string; en: string; zh: string | null; note: string | null; say: string | null };
type MockWord = {
  fr: string;
  en: string;
  type: "noun" | "verb" | "adj" | "phrase" | "other";
  core: boolean;
  gender?: "m" | "f";
  plural?: string;
  forms?: string;
  note?: string;
  ipa: string;
  say?: string;
  pattern?: string;
  example: { fr: string; en: string };
};
type MockSection = {
  slug: string;
  title: string;
  titleFr: string;
  intro: string;
  words: MockWord[];
  sentences: (Omit<Line, "zh" | "note" | "say"> & { who: "me" | "them"; note?: string; say?: string })[];
  tip: { title: string; text: string };
};

const SECTIONS: MockSection[] = [
  {
    slug: "chercher",
    title: "Searching online",
    titleFr: "Chercher en ligne",
    intro: "Finding a car in the listings.",
    words: [
      { fr: "une annonce", en: "a listing, an ad", type: "noun", core: true, gender: "f", ipa: "/yn anɔ̃s/", example: { fr: "J'ai vu une annonce sur Leboncoin.", en: "I saw a listing on Leboncoin." } },
      { fr: "chercher", en: "to look for", type: "verb", core: true, forms: "je cherche, vous cherchez · passé composé : j'ai cherché", note: "No word for “for”: *chercher une voiture*.", ipa: "/ʃɛʁʃe/", example: { fr: "Je cherche une petite voiture.", en: "I'm looking for a small car." } },
      { fr: "d'occasion", en: "used, second-hand", type: "adj", core: true, forms: "d'occasion · d'occasion", note: "It never changes: *une voiture d'occasion*.", ipa: "/dɔkazjɔ̃/", example: { fr: "C'est une voiture d'occasion.", en: "It's a used car." } },
      { fr: "le kilométrage", en: "the mileage", type: "noun", core: true, gender: "m", ipa: "/lə kilɔmetʁaʒ/", example: { fr: "Quel est le kilométrage ?", en: "What's the mileage?" } },
      { fr: "une voiture", en: "a car", type: "noun", core: false, gender: "f", ipa: "/yn vwatyʁ/", say: "-ture has the French u: lips round, tongue forward.", example: { fr: "La voiture est rouge.", en: "The car is red." } },
      { fr: "C'est combien ?", en: "How much is it?", type: "phrase", core: false, ipa: "/sɛ kɔ̃bjɛ̃/", say: "Two nasal vowels: do not say the m or the n.", pattern: "…, c'est combien ? → la voiture · le contrôle technique", example: { fr: "La voiture, c'est combien ?", en: "How much is the car?" } },
    ],
    sentences: [
      { who: "me", fr: "Je cherche une voiture d'occasion.", en: "I'm looking for a used car." },
      { who: "me", fr: "J'ai trouvé une annonce sur Leboncoin.", en: "I found a listing on Leboncoin." },
      { who: "me", fr: "Le kilométrage n'est pas élevé.", en: "The mileage isn't high.", note: "People often drop *ne* when they speak: *c'est pas élevé*." },
    ],
    tip: { title: "Leboncoin", text: "Most private used-car listings in France are on *Leboncoin*." },
  },
  {
    slug: "contacter",
    title: "Contacting the seller",
    titleFr: "Contacter le vendeur",
    intro: "A first phone call about the listing.",
    words: [
      { fr: "le vendeur", en: "the seller", type: "noun", core: true, gender: "m", note: "A woman is *la vendeuse*.", ipa: "/lə vɑ̃dœʁ/", example: { fr: "J'appelle le vendeur.", en: "I'm calling the seller." } },
      { fr: "appeler", en: "to call", type: "verb", core: true, forms: "j'appelle, vous appelez · passé composé : j'ai appelé", note: "Two l in *j'appelle*, one l in *appeler*.", ipa: "/aple/", example: { fr: "Je vais appeler le vendeur.", en: "I'm going to call the seller." } },
      { fr: "Est-ce qu'elle est toujours disponible ?", en: "Is it still available?", type: "phrase", core: true, ipa: "/ɛs kɛl ɛ tuʒuʁ dispɔnibl/", say: "est is just è: the s and t are silent.", note: "*Elle* = *la voiture*: a car is feminine.", pattern: "Est-ce qu'elle est toujours … ? → à vendre · là", example: { fr: "Bonjour, est-ce qu'elle est toujours disponible ?", en: "Hello, is it still available?" } },
      { fr: "Je vous appelle pour l'annonce.", en: "I'm calling about the listing.", type: "phrase", core: false, ipa: "/ʒə vuz‿apɛl puʁ lanɔ̃s/", say: "The s of vous is said z and joins appelle.", pattern: "Je vous appelle pour … → l'annonce · la voiture", example: { fr: "Bonjour, je vous appelle pour l'annonce.", en: "Hello, I'm calling about the listing." } },
      { fr: "le numéro", en: "the (phone) number", type: "noun", core: false, gender: "m", ipa: "/lə nymeʁo/", say: "nu has the French u, not ou.", example: { fr: "Vous avez mon numéro ?", en: "Do you have my number?" } },
      { fr: "disponible", en: "available", type: "adj", core: false, forms: "disponible · disponible", ipa: "/dispɔnibl/", example: { fr: "Vous êtes disponible demain ?", en: "Are you free tomorrow?" } },
    ],
    sentences: [
      { who: "me", fr: "Bonjour, je vous appelle pour l'annonce.", en: "Hello, I'm calling about the listing." },
      { who: "them", fr: "Oui, bonjour. C'est pour la voiture ?", en: "Yes, hello. Is it about the car?" },
      { who: "me", fr: "Oui. Est-ce qu'elle est toujours disponible ?", en: "Yes. Is it still available?" },
      { who: "them", fr: "Oui, vous pouvez venir la voir.", en: "Yes, you can come and see it." },
    ],
    tip: { title: "Call, don't only write", text: "Sellers on Leboncoin get many messages. A short, polite phone call often gets a faster answer." },
  },
  {
    slug: "essayer",
    title: "The test drive",
    titleFr: "L'essai",
    intro: "Checking the car before you decide.",
    words: [
      { fr: "Je peux faire un essai ?", en: "Can I take a test drive?", type: "phrase", core: true, ipa: "/ʒə pø fɛʁ ɛ̃n‿esɛ/", say: "The n of un joins essai.", pattern: "Je peux … ? → voir le moteur · voir la carte grise", example: { fr: "Bonjour, je peux faire un essai ?", en: "Hello, can I take a test drive?" } },
      { fr: "le moteur", en: "the engine", type: "noun", core: true, gender: "m", ipa: "/lə mɔtœʁ/", example: { fr: "Le moteur fait un bruit bizarre.", en: "The engine makes a strange noise." } },
      { fr: "les freins", en: "the brakes", type: "noun", core: true, gender: "m", note: "Usually plural: *les freins*. One brake is *un frein*.", ipa: "/le fʁɛ̃/", say: "The s is silent; ein is a nasal vowel.", example: { fr: "Les freins marchent bien.", en: "The brakes work well." } },
      { fr: "conduire", en: "to drive", type: "verb", core: false, forms: "je conduis, vous conduisez · passé composé : j'ai conduit", ipa: "/kɔ̃dɥiʁ/", example: { fr: "Vous voulez conduire ?", en: "Do you want to drive?" } },
      { fr: "en bon état", en: "in good condition", type: "phrase", core: false, ipa: "/ɑ̃ bɔn‿eta/", say: "Before a vowel, bon loses its nasal sound and links with n: bon‿état.", example: { fr: "La voiture est en bon état.", en: "The car is in good condition." } },
      { fr: "les clés", en: "the keys", type: "noun", core: false, gender: "f", ipa: "/le kle/", example: { fr: "Voici les clés.", en: "Here are the keys." } },
    ],
    sentences: [
      { who: "me", fr: "Je peux faire un essai ?", en: "Can I take a test drive?" },
      { who: "them", fr: "Bien sûr, voici les clés.", en: "Of course, here are the keys." },
      { who: "me", fr: "Les freins marchent bien.", en: "The brakes work well." },
      { who: "them", fr: "Le moteur est en bon état.", en: "The engine is in good condition." },
    ],
    tip: { title: "Le contrôle technique", text: "A car older than four years must have a *contrôle technique* (roadworthiness test) less than six months old when it is sold. Ask to see it." },
  },
  {
    slug: "acheter",
    title: "Buying",
    titleFr: "Acheter",
    intro: "Agreeing on a price and the papers.",
    words: [
      { fr: "le prix", en: "the price", type: "noun", core: true, gender: "m", ipa: "/lə pʁi/", say: "The x is silent.", example: { fr: "Le prix est un peu élevé.", en: "The price is a bit high." } },
      { fr: "négocier", en: "to negotiate", type: "verb", core: true, forms: "je négocie, vous négociez · passé composé : j'ai négocié", ipa: "/neɡɔsje/", example: { fr: "Je voudrais négocier le prix.", en: "I'd like to negotiate the price." } },
      { fr: "la carte grise", en: "the registration document", type: "noun", core: true, gender: "f", plural: "les cartes grises", note: "The official papers of the car, in the owner's name.", ipa: "/la kaʁt ɡʁiz/", example: { fr: "Vous avez la carte grise ?", en: "Do you have the registration document?" } },
      { fr: "Je vous propose…", en: "I'm offering you…", type: "phrase", core: false, ipa: "/ʒə vu pʁɔpoz/", pattern: "Je vous propose … → 9 000 € · 8 500 €", example: { fr: "Je vous propose 9 000 €.", en: "I'm offering you 9,000 €." } },
      { fr: "D'accord.", en: "OK, agreed.", type: "phrase", core: false, ipa: "/dakɔʁ/", say: "The d at the end is silent.", example: { fr: "D'accord, je la prends.", en: "OK, I'll take it." } },
    ],
    sentences: [
      { who: "them", fr: "C'est 9 500 €, c'est mon dernier prix.", en: "It's 9,500 €, that's my final price." },
      { who: "me", fr: "Je vous propose 9 000 €.", en: "I'm offering you 9,000 €." },
      { who: "me", fr: "D'accord, je la prends.", en: "OK, I'll take it." },
    ],
    tip: { title: "Paying safely", text: "For a private sale, people in France often pay by bank transfer or *chèque de banque* (a cheque guaranteed by the bank), not in cash." },
  },
];

const ZH: Record<string, string> = {
  "une annonce": "广告；启事",
  chercher: "寻找",
  "d'occasion": "二手的",
  "le kilométrage": "里程数",
  "le vendeur": "卖家",
  appeler: "打电话",
  "le moteur": "发动机",
  "les freins": "刹车",
  "le prix": "价格",
  négocier: "讲价",
  "la carte grise": "行驶证",
};

const glossOn = (prompt: string) => prompt.includes('("zh" fields): yes');
const line = (fr: string, en: string, say: string | null = null, note: string | null = null): Line => ({ fr, en, zh: null, note, say });

/** The learner's sentence from the feedback prompt, between the """ fences. */
function attemptIn(prompt: string): string {
  const m = prompt.match(/sentence in French about their own situation:\n"""\n([\s\S]*?)\n"""/);
  return (m?.[1] ?? "").trim();
}

function mockFeedback(prompt: string) {
  const text = attemptIn(prompt);
  let fixed = text.replace(/\b([Jj])e (ai|avais|suis allé)/g, "$1'$2").replace(/\s+/g, " ").trim();
  fixed = fixed.charAt(0).toUpperCase() + fixed.slice(1);
  if (fixed && !/[.!?…»]$/.test(fixed)) fixed += ".";
  const ok = fixed === text;
  const notes: string[] = [];
  if (/\b[Jj]e (ai|avais)/.test(text)) notes.push("Good start! Write *j'ai*, not *je ai*: je becomes j' before a vowel.");
  if (!ok && !notes.length) notes.push("Good sentence! Start with a capital letter and end with a full stop.");
  return {
    ok,
    fixed: fixed || "Je cherche une voiture d'occasion.",
    en: "(Mock) the meaning of your sentence.",
    note: ok ? null : notes.slice(0, 2).join(" "),
    natural: ok ? null : "Je cherche une petite voiture d'occasion.",
  };
}

export function mockOutput(stage: Stage, prompt: string): unknown {
  const zh = glossOn(prompt);
  switch (stage) {
    case "questions":
      return { questions: ["Where did you find the car?", "What did the seller say to you?", "How much did you pay?"] };
    case "outline":
      return {
        title: "Buying a used car",
        titleFr: "Acheter une voiture d'occasion",
        summary: "Words and sentences for finding, testing and buying a used car.",
        story: "I looked for a used car online, called a seller, took a test drive and bought it.",
        genderNote: "A woman writes « je suis allée » (with an extra e). It sounds the same.",
        sections: SECTIONS.map((s) => ({ slug: s.slug, title: s.title, titleFr: s.titleFr, intro: s.intro, coreWords: s.words.filter((w) => w.core).map((w) => w.fr) })),
        nextTime: [
          { fr: "Est-ce que je peux voir la carte grise ?", en: "Can I see the registration document?", zh: zh ? "我可以看一下行驶证吗？" : null },
          { fr: "Je voudrais faire un essai plus long.", en: "I'd like a longer test drive.", zh: zh ? "我想试驾久一点。" : null },
          { fr: "Quel est votre dernier prix ?", en: "What's your final price?", zh: zh ? "您最低多少钱？" : null },
        ],
      };
    case "section": {
      const s = SECTIONS.find((x) => prompt.includes(`"${x.titleFr}"`)) ?? SECTIONS[0];
      return {
        words: s.words.map((w) => ({
          fr: w.fr,
          en: w.en,
          zh: zh ? (ZH[w.fr] ?? null) : null,
          type: w.type,
          core: w.core,
          gender: w.gender ?? null,
          plural: w.plural ?? null,
          forms: w.forms ?? null,
          note: w.note ?? null,
          ipa: w.ipa,
          say: w.say ?? null,
          pattern: w.pattern ?? null,
          example: { ...w.example, zh: null },
        })),
        sentences: s.sentences.map((x) => ({ fr: x.fr, en: x.en, zh: null, note: x.note ?? null, who: x.who, say: x.say ?? null })),
        tips: [s.tip],
      };
    }
    case "story": {
      const allee = prompt.includes("feminine (elle)") ? "allée" : "allé";
      return {
        lines: [
          line("Hier, j'ai cherché une voiture d'occasion.", "Yesterday, I looked for a used car."),
          line("J'ai trouvé une annonce sur Leboncoin.", "I found a listing on Leboncoin."),
          line("J'ai regardé le kilométrage et le prix.", "I looked at the mileage and the price."),
          line("J'ai appelé le vendeur.", "I called the seller."),
          line("J'ai dit : « Est-ce qu'elle est toujours disponible ? »", "I said: “Is it still available?”"),
          line("Il m'a dit : « Oui, venez demain. »", "He said: “Yes, come tomorrow.”"),
          line(`Je suis ${allee} chez le vendeur.`, "I went to the seller's place.", "suis allé: the s can join allé with a z sound."),
          line("J'ai testé le moteur et les freins.", "I tested the engine and the brakes.", "The s of freins is silent."),
          line("J'ai négocié le prix.", "I negotiated the price."),
          line("Le vendeur m'a donné la carte grise.", "The seller gave me the registration document."),
          line("La prochaine fois, je vais demander un essai plus long.", "Next time, I'm going to ask for a longer test drive."),
        ],
      };
    }
    case "dialogue":
      return {
        lines: [
          { who: "them", ...line("Allô, oui ?", "Hello? (on the phone)", null, "*Allô* is only used on the phone.") },
          { who: "me", ...line("Bonjour, je vous appelle pour l'annonce.", "Hello, I'm calling about the listing.", "The s of vous is said z and joins appelle.") },
          { who: "them", ...line("Ah oui, la voiture est toujours disponible.", "Ah yes, the car is still available.") },
          { who: "me", ...line("Je peux faire un essai demain ?", "Can I take a test drive tomorrow?", "The n of un joins essai.") },
          { who: "them", ...line("Bien sûr. Vous venez à quelle heure ?", "Of course. What time will you come?") },
          { who: "me", ...line("À dix heures, ça vous va ?", "At ten, is that OK for you?", "The x of dix is said z before heures.") },
          { who: "them", ...line("Parfait, à demain alors !", "Perfect, see you tomorrow then!") },
          { who: "me", ...line("Merci, à demain !", "Thank you, see you tomorrow!") },
        ],
      };
    case "feedback":
      return mockFeedback(prompt);
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
