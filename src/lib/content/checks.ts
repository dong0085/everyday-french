// Cheap rule-based checks that run on every generated topic, before the AI review pass.
// They only flag clear mistakes; anything uncertain is left to the AI review.

import type { DialogueLine, Level, SectionData, StoryLine, Who, Word } from "./schema";
import { fold, wordCount } from "./french";

export type RuleIssue = { id: string; problem: string };

const MAX_WORDS: Record<Level, number> = { A1: 8, A2: 10, B1: 14, B2: 18 };

// "je ai", "le ami", "la école", "de avoir", "que il" → should be elided (j'ai, l'ami…).
// Words starting with h are skipped: h aspiré (le héros) makes them ambiguous.
const NO_ELISION = /\b(je|me|te|se|le|la|ne|de|que)\s+(?=[aeiouyéèêëàâîïôûœ])/i;
const NOUN_ARTICLE = /^(le|la|les|un|une|des|du|de la|de l['’]|l['’])\s*/i;

// Lines staff, sellers or officials say, almost never the learner (folded, at the start of the line).
const THEIR_LINES = [
  "vous voulez",
  "vous desirez",
  "vous avez choisi",
  "vous etes combien",
  "ca fera",
  "et pour vous",
  "et avec ceci",
  "ce sera tout",
  "sur place ou a emporter",
  "qu'est-ce que je vous sers",
  "qu'est-ce que vous desirez",
  "je vous ecoute",
  "je vous apporte",
  "installez-vous",
  "vous payez comment",
  "vous reglez comment",
  "c'est a quel nom",
];

/** A "me" line that sounds like the other person's line, or null. */
export function whoProblem(fr: string, who: Who | null): string | null {
  if (who !== "me") return null;
  const f = fold(fr).replace(/’/g, "'").replace(/^[^a-z]+/, "");
  return THEIR_LINES.some((p) => f.startsWith(p)) ? "This sounds like what the other person says, but it is marked as yours." : null;
}

export function ruleChecks(level: Level, sections: { data: SectionData }[], story: StoryLine[], dialogue: DialogueLine[] = []): RuleIssue[] {
  const issues: RuleIssue[] = [];
  const max = MAX_WORDS[level] + 3;

  const checkLine = (id: string, fr: string, isSentence: boolean) => {
    const m = fr.match(NO_ELISION);
    if (m) issues.push({ id, problem: `Possible missing elision after “${m[1]}” (e.g. j'ai, l'ami).` });
    if (isSentence && wordCount(fr) > max) issues.push({ id, problem: `Long sentence for ${level} (${wordCount(fr)} words).` });
  };
  const checkWho = (id: string, fr: string, who: Who | null) => {
    const p = whoProblem(fr, who);
    if (p) issues.push({ id, problem: p });
  };

  for (const s of sections) {
    for (const w of s.data.words) {
      if (w.type === "noun" && !NOUN_ARTICLE.test(w.fr)) issues.push({ id: w.id, problem: "Noun without an article." });
      if (w.type === "noun" && !w.gender) issues.push({ id: w.id, problem: "Noun without a gender." });
      checkLine(w.id, w.fr, false);
      if (w.example) checkLine(w.id, w.example.fr, true);
    }
    for (const x of s.data.sentences) {
      checkLine(x.id, x.fr, true);
      checkWho(x.id, x.fr, x.who);
    }
  }
  for (const l of story) checkLine(l.id, l.fr, true);
  for (const l of dialogue) {
    checkLine(l.id, l.fr, true);
    checkWho(l.id, l.fr, l.who);
  }
  return issues;
}

// ---------- IPA ----------

// Symbols broad IPA for France French uses (after NFD, so nasal vowels are vowel + U+0303).
const IPA_OK = /^[abdefgijklmnopstuvwyzɑɛəøœɔʁʃʒɲŋɥɡ̃‿ .ː()]+$/u;
const IPA_LETTER = /[a-zɑɛəøœɔʁʃʒɲŋɥɡ]/u;

/**
 * Returns the IPA in a clean "/…/" form, or null when it does not look like France French IPA.
 * Accepts [ ] or missing slashes, drops stress marks, writes r as ʁ.
 */
export function cleanIpa(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = raw.normalize("NFD").trim();
  const m = s.match(/^\/(.+)\/$/) ?? s.match(/^\[(.+)\]$/);
  if (m) s = m[1];
  else if (/[/[\]]/.test(s)) return null;
  s = s
    .replace(/[ˈˌ']/g, "")
    .replace(/[rʀ]/g, "ʁ")
    .replace(/ɐ/g, "a")
    .replace(/\s+/g, " ")
    .trim();
  if (!s || s.length > 200 || !IPA_OK.test(s) || !IPA_LETTER.test(s)) return null;
  return `/${s.normalize("NFC")}/`;
}

/** Cleans every word's IPA in place; bad IPA is dropped silently. */
export function cleanSectionIpa(data: SectionData): SectionData {
  for (const w of data.words) w.ipa = cleanIpa(w.ipa);
  return data;
}

// ---------- My story coverage ----------

const ARTICLE = /^(?:(?:les|le|la|une|un|des|du|de la)\s+|de l'|l'|d')/;
// Past participles and stems the "first letters" rule misses (folded).
const IRREGULAR: [suffix: string, forms: string[]][] = [
  ["prendre", ["pris", "prend", "pren"]],
  ["mettre", ["mis", "met"]],
  ["faire", ["fai", "fait", "fe", "fon"]],
  ["voir", ["vu", "voi", "voy"]],
  ["avoir", ["eu", "ai", "av", "a"]],
  ["etre", ["ete", "suis", "est", "et"]],
  ["aller", ["all", "va", "vai", "ir"]],
  ["venir", ["venu", "vien", "ven"]],
  ["tenir", ["tenu", "tien", "ten"]],
  ["boire", ["bu", "boi", "buv"]],
  ["dire", ["dit", "di"]],
  ["lire", ["lu", "li"]],
  ["pouvoir", ["pu", "peu", "pouv"]],
  ["vouloir", ["voulu", "veu", "voul"]],
  ["devoir", ["du", "doi", "dev"]],
  ["savoir", ["su", "sai", "sav"]],
  ["ouvrir", ["ouvert", "ouvr"]],
  ["offrir", ["offert", "offr"]],
  ["recevoir", ["recu", "recoi", "recev"]],
  ["ecrire", ["ecrit", "ecri"]],
  ["vivre", ["vecu", "vi"]],
  ["connaitre", ["connu", "conna", "connai"]],
  ["paraitre", ["paru", "parai"]],
  ["naitre", ["ne", "nai"]],
  ["mourir", ["mort", "meur"]],
  ["courir", ["couru", "cour"]],
  ["suivre", ["suivi", "sui"]],
  ["conduire", ["conduit", "condui"]],
];

// Longest suffix first, so "pouvoir" is not read as "voir" and "savoir" not as "avoir".
const BY_LENGTH = [...IRREGULAR].sort((a, b) => b[0].length - a[0].length);

function tokens(s: string): string {
  return (
    " " +
    fold(s)
      .replace(/[’']/g, "' ")
      .replace(/[^a-z0-9' ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim() +
    " "
  );
}

/** The folded beginnings that count as "this word was used". */
function stemsOf(w: Pick<Word, "fr" | "type">): string[] {
  let head = fold(w.fr).replace(/[’]/g, "'").replace(/[…?!.]+/g, "").trim();
  head = head.replace(ARTICLE, "");
  if (w.type === "verb") {
    head = head.replace(/^(se |s')/, "");
    const first = head.split(" ")[0];
    const irregular = BY_LENGTH.find(([suffix]) => first.endsWith(suffix));
    if (irregular) {
      const prefix = first.slice(0, first.length - irregular[0].length); // "com" in comprendre
      return [first, ...irregular[1].map((f) => prefix + f)];
    }
    const stem = first.replace(/(er|ir|re|oir)$/, "");
    return [stem.length >= 3 ? stem.slice(0, 5) : first];
  }
  if (w.type === "adj") return [head.slice(0, Math.max(3, head.length - 1))];
  // Nouns and others: allow a plural or singular in the story.
  return [head.replace(/(s|x)$/, "")].filter((h) => h.length >= 2);
}

/** Core words (not phrases) that never appear in My story. Matches word beginnings, accent-insensitive. */
export function missingCoreWords(sections: { data: SectionData }[], story: { fr: string }[]): string[] {
  const hay = tokens(story.map((l) => l.fr).join(" "));
  const missing: string[] = [];
  for (const s of sections) {
    for (const w of s.data.words) {
      if (!w.core || w.type === "phrase") continue;
      const stems = stemsOf(w).map((x) => tokens(x).trim()).filter(Boolean);
      if (!stems.length) continue;
      if (!stems.some((x) => hay.includes(" " + x))) missing.push(w.fr);
    }
  }
  return missing;
}

/** The note shown on My story when core words are missing, or null. */
export function coverageProblem(missing: string[]): string | null {
  if (!missing.length) return null;
  return `Core words not used in My story: ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? "…" : ""}.`;
}
