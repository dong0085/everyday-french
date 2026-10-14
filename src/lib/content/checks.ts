// Cheap rule-based checks that run on every generated topic, before the AI review pass.
// They only flag clear mistakes; anything uncertain is left to the AI review.

import type { Level, SectionData, StoryLine } from "./schema";
import { wordCount } from "./french";

export type RuleIssue = { id: string; problem: string };

const MAX_WORDS: Record<Level, number> = { A1: 8, A2: 10, B1: 14, B2: 18 };

// "je ai", "le ami", "la école", "de avoir", "que il" → should be elided (j'ai, l'ami…).
// Words starting with h are skipped: h aspiré (le héros) makes them ambiguous.
const NO_ELISION = /\b(je|me|te|se|le|la|ne|de|que)\s+(?=[aeiouyéèêëàâîïôûœ])/i;
const NOUN_ARTICLE = /^(le|la|les|un|une|des|du|de la|de l['’]|l['’])\s*/i;

export function ruleChecks(level: Level, sections: { data: SectionData }[], story: StoryLine[]): RuleIssue[] {
  const issues: RuleIssue[] = [];
  const max = MAX_WORDS[level] + 3;

  const checkLine = (id: string, fr: string, isSentence: boolean) => {
    const m = fr.match(NO_ELISION);
    if (m) issues.push({ id, problem: `Possible missing elision after “${m[1]}” (e.g. j'ai, l'ami).` });
    if (isSentence && wordCount(fr) > max) issues.push({ id, problem: `Long sentence for ${level} (${wordCount(fr)} words).` });
  };

  for (const s of sections) {
    for (const w of s.data.words) {
      if (w.type === "noun" && !NOUN_ARTICLE.test(w.fr)) issues.push({ id: w.id, problem: "Noun without an article." });
      if (w.type === "noun" && !w.gender) issues.push({ id: w.id, problem: "Noun without a gender." });
      checkLine(w.id, w.fr, false);
      if (w.example) checkLine(w.id, w.example.fr, true);
    }
    for (const x of s.data.sentences) checkLine(x.id, x.fr, true);
  }
  for (const l of story) checkLine(l.id, l.fr, true);
  return issues;
}
