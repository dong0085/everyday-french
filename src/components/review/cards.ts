// Pure helpers for review cards, shared by the server (building the deck) and the browser (playing it).
// Cloze gaps, build-the-sentence tiles, dictation diffs and the learner's local date. No I/O here.

import { fold } from "@/lib/content/french";
import type { WordType } from "@/lib/content/schema";

/** Kinds stored in review_items. */
export type ReviewKind = "word" | "phrase" | "sentence" | "mine" | "story" | "dialogue";
/** Card kinds: practice decks can also hold lines the other person says. */
export type CardKind = ReviewKind | "them";
/** What the front of a card asks for. */
export type Face = "cloze" | "meaning" | "french" | "listen" | "build";
/** Got it / Not yet / Skip: only decides when a card comes back. */
export type Result = "got" | "again" | "skip";
/** What the learner picked in the options: "auto" lets each card choose. */
export type Side = "auto" | "meaning" | "french" | "listen";

export type Example = { fr: string; en: string; zh: string | null };
export type Cloze = { before: string; answer: string; after: string };

export type Card = {
  key: string;
  /** review_items.id; null in practice decks (nothing is graded there). */
  id: string | null;
  topicId: string;
  topicTitleFr: string;
  lineId: string;
  kind: CardKind;
  wordType: WordType | null;
  fr: string;
  en: string;
  zh: string | null;
  gender: "m" | "f" | null;
  ipa: string | null;
  say: string | null;
  forms: string | null;
  example: Example | null;
  /** The face this card shows in "auto". */
  face: Face;
  /** For words and phrases: the example sentence with the word cut out. */
  cloze: Cloze | null;
  /** For sentences: the tiles in the right order, and the order they are shown in. */
  tiles: string[] | null;
  order: number[] | null;
};

// ---------- folding with an index map ----------

const LETTER = /[\p{L}\p{N}]/u;

/** fold() each character, remembering where every folded character came from. */
function foldMap(s: string): { f: string; map: number[] } {
  let f = "";
  const map: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i] === "’" ? "'" : s[i];
    const x = fold(c);
    for (let k = 0; k < x.length; k++) {
      f += x[k];
      map.push(i);
    }
  }
  return { f, map };
}

const ARTICLE = /^(le |la |les |l'|l’|un |une |des |du |de la |de l'|de l’|d'|d’)/i;
const REFLEXIVE = /^(se |s'|s’)/i;

/** "Je voudrais…" → "Je voudrais", "C'est combien ?" → "C'est combien". */
function bareHeadword(fr: string): string {
  return fr
    .replace(/(…|\.\.\.)\s*$/, "")
    .replace(/\s*[?!.]+\s*$/, "")
    .trim();
}

/**
 * Finds the word inside its example sentence and cuts it out. Tries the whole headword first,
 * then without its article, then (verbs) the stem, so "attendre" matches "J'attends une table".
 * Null when the example does not contain the word.
 */
export function findCloze(fr: string, type: WordType | null, sentence: string): Cloze | null {
  const head = bareHeadword(fr);
  const tries: { text: string; stem: boolean }[] = [{ text: head, stem: false }];
  const noArticle = head.replace(ARTICLE, "");
  if (noArticle !== head && noArticle.length >= 2) tries.push({ text: noArticle, stem: false });
  if (type === "verb") {
    const inf = head.replace(REFLEXIVE, "");
    const stem = fold(inf).replace(/(er|ir|re)$/, "");
    if (stem.length >= 4 && !stem.includes(" ")) tries.push({ text: stem, stem: true });
  }
  const { f, map } = foldMap(sentence);
  for (const t of tries) {
    const needle = foldMap(t.text).f;
    if (!needle.trim()) continue;
    let from = 0;
    while (from <= f.length - needle.length) {
      const at = f.indexOf(needle, from);
      if (at < 0) break;
      from = at + 1;
      let end = at + needle.length;
      if (at > 0 && LETTER.test(f[at - 1]) && LETTER.test(needle[0])) continue;
      if (t.stem) while (end < f.length && LETTER.test(f[end])) end++;
      else if (end < f.length && LETTER.test(f[end]) && LETTER.test(needle[needle.length - 1])) continue;
      const start = map[at];
      const stop = map[end - 1] + 1;
      return { before: sentence.slice(0, start), answer: sentence.slice(start, stop), after: sentence.slice(stop) };
    }
  }
  return null;
}

// ---------- build-the-sentence tiles ----------

/** Fixed chunks that always stay one tile (folded, lowercase). */
const CHUNKS = [
  "s'il vous plait",
  "s'il te plait",
  "qu'est-ce que",
  "qu'est-ce qu'",
  "est-ce que",
  "est-ce qu'",
  "il y a",
  "il y avait",
  "je voudrais",
  "au revoir",
  "tout de suite",
  "a cote de",
  "en face de",
  "bien sur",
  "un peu",
  "pas de",
  "ne pas",
  "par carte",
  "en espece",
  "en especes",
  "a bientot",
  "de rien",
].map((c) => c.split(" "));

/** Small words that read better glued to the word after them. */
const GLUE = new Set(["le", "la", "les", "un", "une", "des", "du", "de", "au", "aux", "a", "en", "ma", "mon", "mes", "ta", "ton", "tes", "sa", "son", "ses", "ce", "cet", "cette", "ces", "votre", "vos", "notre", "nos", "leur", "leurs", "ne", "tres", "pour", "par", "avec", "sans", "dans", "sur", "chez"]);

const PUNCT_ONLY = /^[?!:;»….,]+$/;
const bare = (t: string) => fold(t.replace(/’/g, "'")).replace(/[?!:;,.…«»"]+/g, "");

function words(fr: string): string[] {
  const raw = fr.trim().split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (const t of raw) {
    if (PUNCT_ONLY.test(t) && out.length) out[out.length - 1] += " " + t;
    else if (t === "«") out.push(t);
    else if (out.length && out[out.length - 1] === "«") out[out.length - 1] += " " + t;
    else out.push(t);
  }
  return out;
}

function joinChunks(tokens: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length; ) {
    let took = 1;
    for (const c of CHUNKS) {
      if (i + c.length > tokens.length) continue;
      const last = c.length - 1;
      const hit = c.every((w, k) => {
        const b = bare(tokens[i + k]);
        // "est-ce qu'" matches "qu'il"; everything else must match the whole word.
        return k === last && w.endsWith("'") ? b.startsWith(w) : b === w;
      });
      if (hit && c.length > took) took = c.length;
    }
    // "est-ce" always takes the word after it ("est-ce qu'il", "est-ce que").
    if (took === 1 && bare(tokens[i]).endsWith("est-ce") && i + 1 < tokens.length) took = 2;
    out.push(tokens.slice(i, i + took).join(" "));
    i += took;
  }
  return out;
}

function glue(tokens: string[]): string[] {
  const out: string[] = [];
  let pending = "";
  tokens.forEach((t, i) => {
    const small = !t.includes(" ") && GLUE.has(bare(t)) && i < tokens.length - 1;
    if (small) pending += t + " ";
    else {
      out.push(pending + t);
      pending = "";
    }
  });
  if (pending) out.push(pending.trim());
  return out;
}

/** Merges the two shortest neighbours until there are at most `max` tiles. */
function capTiles(tiles: string[], max: number): string[] {
  const t = [...tiles];
  while (t.length > max) {
    let best = 0;
    for (let i = 1; i < t.length - 1; i++) if (t[i].length + t[i + 1].length < t[best].length + t[best + 1].length) best = i;
    t.splice(best, 2, `${t[best]} ${t[best + 1]}`);
  }
  return t;
}

/**
 * Splits a sentence into 4–7 tiles, keeping elisions (j'ai), fixed chunks (s'il vous plaît,
 * est-ce que) and small words with their noun (une table) together. Null if it is too short.
 */
export function buildTiles(fr: string): string[] | null {
  const chunked = joinChunks(words(fr));
  let tiles = glue(chunked);
  if (tiles.length < 4) tiles = chunked;
  if (tiles.length < 4) return null;
  return capTiles(tiles, 7);
}

/** A shuffled order of n tiles that is never the right order. */
export function shuffledOrder(n: number, rand: () => number = Math.random): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  if (n < 2) return order;
  for (let tries = 0; tries < 5; tries++) {
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (order.some((v, i) => v !== i)) return order;
  }
  return [...order.slice(1), order[0]];
}

// ---------- dictation ----------

export type DiffChar = { ch: string; status: "ok" | "accent" | "miss" };

/**
 * Compares what the learner typed with the French, letter by letter (longest common subsequence).
 * Every letter of the French gets a status: ok, accent (right letter, wrong or missing accent) or miss.
 */
export function dictationDiff(target: string, typed: string): { chars: DiffChar[]; exact: boolean; accentsOnly: boolean } {
  const a = [...target.replace(/’/g, "'")];
  const b = [...typed.replace(/’/g, "'")];
  const fa = a.map((c) => fold(c));
  const fb = b.map((c) => fold(c));
  const n = a.length;
  const m = b.length;
  const L: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) L[i][j] = fa[i] === fb[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const chars: DiffChar[] = [];
  let i = 0;
  let j = 0;
  while (i < n) {
    if (j < m && fa[i] === fb[j]) {
      chars.push({ ch: a[i], status: a[i].toLowerCase() === b[j].toLowerCase() ? "ok" : "accent" });
      i++;
      j++;
    } else if (j < m && L[i][j + 1] >= L[i + 1][j]) j++;
    else {
      chars.push({ ch: a[i], status: "miss" });
      i++;
    }
  }
  const norm = (s: string) => s.toLowerCase().replace(/’/g, "'").replace(/[^\p{L}\p{N}']+/gu, " ").trim();
  const exact = norm(target) === norm(typed);
  const accentsOnly = !exact && fold(norm(target)) === fold(norm(typed));
  return { chars, exact, accentsOnly };
}

// ---------- dates ----------

/** The learner's date (YYYY-MM-DD) on this device. */
export function localToday(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
