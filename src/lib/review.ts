// Light spaced review: which lines of a topic are in the learner's review deck, and when each is due.
// Boxes 0–5 → next review after 1 / 3 / 7 / 14 / 30 / 30 days. No scores, nothing graduates out.
import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/providers/errors";
import { sectionDataSchema, sentenceSchema, type SectionData, type Sentence, type Word } from "@/lib/content/schema";
import { buildTiles, findCloze, shuffledOrder, type Card, type CardKind, type Face, type Result, type ReviewKind } from "@/components/review/cards";

export type { Result };

/** Days until the next review, by box (the box a card is in after "Got it"). */
export const INTERVALS = [1, 3, 7, 14, 30, 30] as const;
export const MAX_BOX = INTERVALS.length - 1;
/** Cards in one sitting. */
export const SESSION_MAX = 20;

// ---------- topic lines ----------

export type TopicContent = { sections: { data: SectionData }[]; storyFr: Sentence[]; dialogue: Sentence[] };

/** One line of a topic that could be a card. `inDeck`: it goes into the review deck without a star. */
export type TopicLine = {
  lineId: string;
  kind: CardKind;
  fr: string;
  en: string;
  zh: string | null;
  say: string | null;
  word: Word | null;
  inDeck: boolean;
};

/** Stored JSON lines (story, dialogue) → sentences; old rows get the new fields' defaults, broken ones are dropped. */
export function parseLines(json: unknown): Sentence[] {
  if (!Array.isArray(json)) return [];
  return json.flatMap((l) => {
    const p = sentenceSchema.safeParse(l);
    return p.success ? [p.data] : [];
  });
}

export function contentOf(t: { story_fr: unknown; dialogue?: unknown; topic_sections?: { data: unknown; position?: number }[] | null }): TopicContent {
  const sections = [...(t.topic_sections ?? [])]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .flatMap((s) => {
      const p = sectionDataSchema.safeParse(s.data);
      return p.success ? [{ data: p.data }] : [];
    });
  return { sections, storyFr: parseLines(t.story_fr), dialogue: parseLines(t.dialogue) };
}

/** Every line of a topic, in reading order, with the card kind it would be. */
export function topicLines(t: TopicContent): TopicLine[] {
  const out: TopicLine[] = [];
  const sentence = (s: Sentence, kind: CardKind, inDeck: boolean) =>
    out.push({ lineId: s.id, kind, fr: s.fr, en: s.en, zh: s.zh, say: s.say, word: null, inDeck });
  for (const { data } of t.sections) {
    for (const w of data.words)
      out.push({ lineId: w.id, kind: w.type === "phrase" ? "phrase" : "word", fr: w.fr, en: w.en, zh: w.zh, say: w.say, word: w, inDeck: w.core });
    for (const s of data.sentences) {
      if (s.mine) sentence(s, "mine", true);
      else if (s.who === "them") sentence(s, "them", false);
      else sentence(s, "sentence", true);
    }
  }
  for (const s of t.storyFr) sentence(s, "story", true);
  for (const s of t.dialogue) sentence(s, s.who === "me" ? "dialogue" : "them", s.who === "me");
  return out;
}

/**
 * The lines of a topic that belong in the review deck: core words and phrases, the learner's own
 * sentences, section sentences they say, My story, and their dialogue lines. Extra words only when starred.
 */
export function reviewLinesOf(t: TopicContent, starred: ReadonlySet<string> = new Set()): { lineId: string; kind: ReviewKind; fr: string }[] {
  const seen = new Set<string>();
  const out: { lineId: string; kind: ReviewKind; fr: string }[] = [];
  for (const l of topicLines(t)) {
    if (l.kind === "them" || seen.has(l.lineId)) continue;
    if (!l.inDeck && !(l.word && starred.has(l.lineId))) continue;
    seen.add(l.lineId);
    out.push({ lineId: l.lineId, kind: l.kind, fr: l.fr.slice(0, 400) });
  }
  return out;
}

// ---------- scheduling ----------

type Sched = { box: number; reps: number; lapses: number };

const DAY = 86_400_000;
export function addDays(date: string, n: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
}
export function serverToday(now: number = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}
/** The learner's date when it is a real date within a day of the server's (UTC); else the server's. */
export function pickToday(client: string | null | undefined, now: number = Date.now()): string {
  const server = serverToday(now);
  if (!client || !/^\d{4}-\d{2}-\d{2}$/.test(client) || Number.isNaN(Date.parse(`${client}T00:00:00Z`))) return server;
  if (addDays(client, 0) !== client) return server; // 2026-02-31 and the like
  return Math.abs(Date.parse(client) - Date.parse(server)) <= DAY ? client : server;
}

/** The learner's date in a time zone (from the ef.tz cookie); UTC when unknown. */
export function todayIn(tz: string | null | undefined, now: number = Date.now()): string {
  if (tz) {
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
    } catch {
      // not a real time zone
    }
  }
  return serverToday(now);
}

/** Got it → next box, later; Not yet → box 0, tomorrow; Skip → tomorrow, same box. */
export function schedule(item: Sched, result: Result, today: string): Sched & { due_on: string } {
  const box = Math.min(Math.max(item.box, 0), MAX_BOX);
  if (result === "got") {
    const next = Math.min(box + 1, MAX_BOX);
    return { box: next, reps: item.reps + 1, lapses: item.lapses, due_on: addDays(today, INTERVALS[next]) };
  }
  if (result === "again") return { box: 0, reps: item.reps + 1, lapses: item.lapses + 1, due_on: addDays(today, 1) };
  return { box, reps: item.reps, lapses: item.lapses, due_on: addDays(today, 1) };
}

// ---------- keeping rows in step with content ----------

/**
 * Rebuilds the review rows for one topic from its current content (adds new lines, removes deleted
 * ones, keeps the box/due date of lines that are still there). Call it when a topic becomes ready and
 * after any edit that adds, changes or removes lines. Never throws: review is a convenience.
 */
export async function syncReviewItems(topicId: string, userId: string): Promise<void> {
  try {
    const db = adminClient();
    const { data: t, error } = await db
      .from("topics")
      .select("id, status, is_example, story_fr, dialogue, topic_sections(data, position)")
      .eq("id", topicId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    // The example's rows are only the words the learner starred; other topics wait until they are ready.
    if (!t || t.status !== "ready" || t.is_example) return;

    const { data: rows, error: e2 } = await db.from("review_items").select("id, line_id, kind, fr, starred").eq("user_id", userId).eq("topic_id", topicId);
    if (e2) throw e2;
    const have = rows ?? [];
    const starred = new Set(have.filter((r) => r.starred).map((r) => r.line_id));
    const want = reviewLinesOf(contentOf(t), starred);
    const byLine = new Map(have.map((r) => [r.line_id, r]));
    const wanted = new Set(want.map((l) => l.lineId));

    const add = want.filter((l) => !byLine.has(l.lineId)).map((l) => ({ user_id: userId, topic_id: topicId, line_id: l.lineId, kind: l.kind, fr: l.fr }));
    const changed = want.flatMap((l) => {
      const r = byLine.get(l.lineId);
      return r && (r.fr !== l.fr || r.kind !== l.kind) ? [{ id: r.id, fr: l.fr, kind: l.kind }] : [];
    });
    const gone = have.filter((r) => !wanted.has(r.line_id)).map((r) => r.id);

    const jobs: PromiseLike<{ error: unknown }>[] = [];
    // New rows start in box 0, due tomorrow (the column default): today is the topic page itself.
    if (add.length) jobs.push(db.from("review_items").upsert(add, { onConflict: "user_id,topic_id,line_id", ignoreDuplicates: true }));
    for (const c of changed) jobs.push(db.from("review_items").update({ fr: c.fr, kind: c.kind }).eq("id", c.id).eq("user_id", userId));
    if (gone.length) jobs.push(db.from("review_items").delete().in("id", gone).eq("user_id", userId));
    for (const r of await Promise.all(jobs)) if (r.error) throw r.error;
  } catch (err) {
    logError("review sync", err);
  }
}

/** Gives topics from before spaced review (ready, not the example, no rows yet) their review rows. */
export async function backfillReviewItems(userId: string): Promise<void> {
  try {
    const { data, error } = await adminClient()
      .from("topics")
      .select("id, review_items(count)")
      .eq("user_id", userId)
      .eq("status", "ready")
      .eq("is_example", false);
    if (error) throw error;
    const missing = (data ?? []).filter((t) => !((t.review_items as unknown as { count: number }[] | null)?.[0]?.count ?? 0)).slice(0, 12);
    await Promise.all(missing.map((t) => syncReviewItems(t.id, userId)));
  } catch (err) {
    logError("review backfill", err);
  }
}

// ---------- decks ----------

type TopicRow = { id: string; title_fr: string; story_fr: unknown; dialogue: unknown; topic_sections: { data: unknown; position: number }[] | null };
const TOPIC_COLUMNS = "id, title_fr, story_fr, dialogue, topic_sections(data, position)";

function shuffle<T>(list: T[], rand: () => number = Math.random): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Picks how a card asks: words through their example (cloze), "them" lines by ear, the learner's lines from the meaning. */
export function faceFor(
  line: Pick<TopicLine, "kind" | "fr" | "word">,
  box: number,
  opts: { practice?: boolean; rand?: () => number } = {},
): Pick<Card, "face" | "cloze" | "tiles" | "order"> {
  const rand = opts.rand ?? Math.random;
  const w = line.word;
  if (w) {
    const cloze = w.example ? findCloze(w.fr, w.type, w.example.fr) : null;
    return { face: cloze ? "cloze" : "meaning", cloze, tiles: null, order: null };
  }
  if (line.kind === "them") return { face: "listen", cloze: null, tiles: null, order: null };
  const tiles = buildTiles(line.fr);
  const buildChance = opts.practice ? 0.3 : box >= 1 ? 0.4 : 0;
  if (tiles && rand() < buildChance) return { face: "build", cloze: null, tiles, order: shuffledOrder(tiles.length, rand) };
  return { face: "meaning" as Face, cloze: null, tiles: null, order: null };
}

function cardOf(line: TopicLine, topic: { id: string; title_fr: string }, row: { id: string; box: number } | null, practice: boolean): Card {
  const w = line.word;
  return {
    key: `${topic.id}:${line.lineId}`,
    id: practice ? null : (row?.id ?? null),
    topicId: topic.id,
    topicTitleFr: topic.title_fr,
    lineId: line.lineId,
    kind: line.kind,
    wordType: w?.type ?? null,
    fr: line.fr,
    en: line.en,
    zh: line.zh,
    gender: w?.gender ?? null,
    ipa: w?.ipa ?? null,
    say: line.say,
    forms: w?.forms ?? null,
    example: w?.example ?? null,
    ...faceFor(line, row?.box ?? 0, { practice }),
  };
}

export type DueDeck = { cards: Card[]; dueTotal: number; tomorrow: number; hasItems: boolean };

/** Today's cards (at most 20), oldest due first, then mixed so topics interleave. Runs as the user (RLS). */
export async function loadDueDeck(userId: string, today: string): Promise<DueDeck> {
  const supabase = await createClient();
  const [due, next, all] = await Promise.all([
    supabase
      .from("review_items")
      .select("id, topic_id, line_id, box", { count: "exact" })
      .eq("user_id", userId)
      .lte("due_on", today)
      .order("due_on")
      .order("box")
      .limit(SESSION_MAX * 2),
    supabase.from("review_items").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("due_on", addDays(today, 1)),
    supabase.from("review_items").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  const rows = due.data ?? [];
  const base = { dueTotal: due.count ?? rows.length, tomorrow: next.count ?? 0, hasItems: (all.count ?? 0) > 0 };
  if (!rows.length) return { cards: [], ...base };

  const { data: topics } = await supabase.from("topics").select(TOPIC_COLUMNS).in("id", [...new Set(rows.map((r) => r.topic_id))]);
  const lines = new Map<string, { topic: TopicRow; byId: Map<string, TopicLine> }>();
  for (const t of (topics ?? []) as TopicRow[]) lines.set(t.id, { topic: t, byId: new Map(topicLines(contentOf(t)).map((l) => [l.lineId, l])) });

  const cards: Card[] = [];
  const stale = new Set<string>();
  let staleRows = 0;
  for (const r of rows) {
    const t = lines.get(r.topic_id);
    const line = t?.byId.get(r.line_id);
    if (!t || !line) {
      stale.add(r.topic_id);
      staleRows++;
      continue;
    }
    if (cards.length < SESSION_MAX) cards.push(cardOf(line, t.topic, r, false));
  }
  // A row whose line was edited away: tidy that topic's rows for next time.
  if (stale.size) await Promise.all([...stale].map((id) => syncReviewItems(id, userId)));
  return { cards: shuffle(cards), ...base, dueTotal: Math.max(base.dueTotal - staleRows, cards.length) };
}

/** 20 random lines from every ready topic, the example included. Nothing is graded. */
export async function loadPracticeDeck(userId: string): Promise<Card[]> {
  const supabase = await createClient();
  const { data: topics } = await supabase.from("topics").select(TOPIC_COLUMNS).eq("user_id", userId).eq("status", "ready");
  const pool: { line: TopicLine; topic: TopicRow }[] = [];
  for (const t of (topics ?? []) as TopicRow[]) for (const line of topicLines(contentOf(t))) pool.push({ line, topic: t });
  return shuffle(pool)
    .slice(0, SESSION_MAX)
    .map(({ line, topic }) => cardOf(line, topic, null, true));
}
