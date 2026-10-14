// The topic generation job: outline → sections (in parallel) → My story → review.
// Runs on the server after the response is sent (next/server `after`). Every stage is saved,
// so a failed or interrupted job continues from where it stopped.
import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { getKey } from "@/lib/keys/store";
import { generateStructured, type Usage } from "@/lib/providers/llm";
import { provider as providerInfo } from "@/lib/providers/catalog";
import { AppError, logError, toAppError } from "@/lib/providers/errors";
import { recordUsage } from "@/lib/usage";
import { ruleChecks } from "./checks";
import { checkPrompt, outlinePrompt, sectionPrompt, storyPrompt, type Learner } from "./prompt";
import {
  checkOut,
  outlineOut,
  sectionDataSchema,
  sectionOut,
  storyOut,
  toSectionData,
  toStoryLines,
  type Flag,
  type Level,
  type SectionData,
  type StoryLine,
} from "./schema";

type Conn = { provider: string; model: string; keyId?: string | null };
type TopicRow = {
  id: string;
  user_id: string;
  source_text: string;
  answers: unknown;
  level: string;
  explain_lang: string;
  self_gender: string;
  zh_gloss: boolean;
  stage: string;
  story: string;
  title: string;
  story_fr: unknown;
};
type SectionRow = {
  id: string;
  position: number;
  slug: string;
  title: string;
  title_fr: string;
  intro: string;
  core_words: unknown;
  status: string;
  data: unknown;
};

const db = () => adminClient();

function learnerOf(t: TopicRow): Learner {
  return {
    level: t.level as Level,
    explainLang: t.explain_lang === "zh" ? "zh" : "en",
    selfGender: (["m", "f"].includes(t.self_gender) ? t.self_gender : "x") as Learner["selfGender"],
    zhGloss: t.zh_gloss,
  };
}

function answersOf(t: TopicRow) {
  return Array.isArray(t.answers) ? (t.answers as { question: string; answer: string }[]) : null;
}

function costOf(conn: Conn, u: Usage): number | null {
  const m = providerInfo(conn.provider)?.textModels?.find((x) => x.id === conn.model);
  return m?.price ? (u.in * m.price.in + u.out * m.price.out) / 1_000_000 : null;
}

async function call<T>(userId: string, conn: Conn, stage: Parameters<typeof generateStructured>[0]["stage"], schema: Parameters<typeof generateStructured<T>>[0]["schema"], prompt: string) {
  const key = conn.provider === "mock" ? ("mock" as const) : await getKey(userId, conn.provider, conn.keyId);
  const { output, usage } = await generateStructured<T>({ key, model: conn.model, schema, prompt, stage });
  await recordUsage({
    userId,
    kind: "llm",
    provider: conn.provider,
    model: conn.model,
    units: usage.in + usage.out,
    unitType: "tokens",
    costUsd: costOf(conn, usage),
  });
  return output;
}

async function loadTopic(topicId: string, userId: string): Promise<TopicRow> {
  const { data, error } = await db().from("topics").select("*").eq("id", topicId).eq("user_id", userId).single();
  if (error || !data) throw new AppError("bad_request", "Topic not found.", 404);
  return data as TopicRow;
}

async function loadSections(topicId: string, userId: string): Promise<SectionRow[]> {
  const { data, error } = await db()
    .from("topic_sections")
    .select("id, position, slug, title, title_fr, intro, core_words, status, data")
    .eq("topic_id", topicId)
    .eq("user_id", userId)
    .order("position");
  if (error) throw error;
  return data as SectionRow[];
}

async function updateTopic(topicId: string, userId: string, patch: Database["public"]["Tables"]["topics"]["Update"]) {
  const { error } = await db().from("topics").update(patch).eq("id", topicId).eq("user_id", userId);
  if (error) throw error;
}

function outlineFrom(t: TopicRow, sections: SectionRow[]) {
  return {
    title: t.title,
    story: t.story,
    sections: sections.map((s) => ({
      slug: s.slug,
      title: s.title,
      titleFr: s.title_fr,
      coreWords: (s.core_words as string[]) ?? [],
    })),
  };
}

function slugify(s: string, used: Set<string>): string {
  let base = s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "section";
  if (base === "story") base = "story-part";
  let slug = base;
  for (let i = 2; used.has(slug); i++) slug = `${base}-${i}`;
  used.add(slug);
  return slug;
}

async function pool<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(size, queue.length) }, async () => {
    while (queue.length) await fn(queue.shift()!);
  }));
}

// ---------- stages ----------

async function outlineStage(t: TopicRow, conn: Conn) {
  const out = await call(t.user_id, conn, "outline", outlineOut, outlinePrompt(learnerOf(t), t.source_text, answersOf(t)));
  if (out.sections.length < 2) throw new AppError("bad_output", undefined, 502);
  const used = new Set<string>();
  const rows = out.sections.slice(0, 8).map((s, i) => ({
    topic_id: t.id,
    user_id: t.user_id,
    position: i,
    slug: slugify(s.slug || s.title, used),
    title: s.title,
    title_fr: s.titleFr,
    intro: s.intro,
    core_words: s.coreWords.slice(0, 8),
    status: "pending",
  }));
  await db().from("topic_sections").delete().eq("topic_id", t.id).eq("user_id", t.user_id);
  const { error } = await db().from("topic_sections").insert(rows);
  if (error) throw error;
  await updateTopic(t.id, t.user_id, {
    title: out.title,
    title_fr: out.titleFr,
    summary: out.summary,
    story: out.story,
    gender_note: out.genderNote,
    stage: "sections",
  });
}

async function writeSection(t: TopicRow, conn: Conn, all: SectionRow[], s: SectionRow, extraRequest?: string | null) {
  await db().from("topic_sections").update({ status: "generating", error: null }).eq("id", s.id).eq("user_id", t.user_id);
  try {
    const out = await call(
      t.user_id,
      conn,
      "section",
      sectionOut,
      sectionPrompt(learnerOf(t), t.source_text, answersOf(t), outlineFrom(t, all), s.slug, extraRequest),
    );
    const data = toSectionData(out);
    for (const issue of ruleChecks(t.level as Level, [{ data }], [])) flagIn(data, issue.id, { problem: issue.problem, suggestion: null, field: "fr" });
    const { error } = await db().from("topic_sections").update({ status: "ready", data }).eq("id", s.id).eq("user_id", t.user_id);
    if (error) throw error;
  } catch (err) {
    logError("section", err);
    await db()
      .from("topic_sections")
      .update({ status: "failed", error: toAppError(err).message })
      .eq("id", s.id)
      .eq("user_id", t.user_id);
    throw err;
  }
}

async function sectionsStage(t: TopicRow, conn: Conn) {
  const all = await loadSections(t.id, t.user_id);
  const todo = all.filter((s) => s.status !== "ready");
  let firstError: unknown = null;
  await pool(todo, 3, async (s) => {
    try {
      await writeSection(t, conn, all, s);
    } catch (err) {
      firstError ??= err;
    }
  });
  if (firstError) throw firstError;
  await updateTopic(t.id, t.user_id, { stage: "story" });
}

async function storyStage(t: TopicRow, conn: Conn) {
  const sections = await loadSections(t.id, t.user_id);
  const datas = sections.map((s) => sectionDataSchema.parse(s.data));
  const core = datas.flatMap((d) => d.words.filter((w) => w.core && w.type !== "phrase").map((w) => w.fr));
  const phrases = datas.flatMap((d) => d.words.filter((w) => w.type === "phrase").map((w) => w.fr));
  const out = await call(t.user_id, conn, "story", storyOut, storyPrompt(learnerOf(t), t.source_text, answersOf(t), t, core, phrases));
  const lines = toStoryLines(out);
  for (const issue of ruleChecks(t.level as Level, [], lines)) {
    const l = lines.find((x) => x.id === issue.id);
    if (l && !l.flag) l.flag = { problem: issue.problem, suggestion: null, field: "fr" };
  }
  await updateTopic(t.id, t.user_id, { story_fr: lines, stage: "check" });
}

/** Puts a review flag on a word or sentence ("w123.ex" = the word's example). AI flags replace rule flags. */
function flagIn(data: SectionData, id: string, flag: Flag, replace = false) {
  const [base, sub] = id.split(".");
  const field = sub === "ex" ? "example" : "fr";
  for (const list of [data.words, data.sentences]) {
    const item = list.find((x) => x.id === base);
    if (item && (replace || !item.flag)) item.flag = { ...flag, field };
  }
}

async function checkStage(t: TopicRow, conn: Conn) {
  const sections = await loadSections(t.id, t.user_id);
  const datas = sections.map((s) => sectionDataSchema.parse(s.data));
  const story = (t.story_fr as StoryLine[]) ?? [];

  const lines: { id: string; field: string; fr: string; en?: string; extra?: string }[] = [];
  for (const d of datas) {
    for (const w of d.words) {
      lines.push({ id: w.id, field: "fr", fr: w.fr, en: w.en, extra: [w.type, w.gender, w.forms].filter(Boolean).join(", ") });
      if (w.example) lines.push({ id: `${w.id}.ex`, field: "fr", fr: w.example.fr, en: w.example.en });
    }
    for (const s of d.sentences) lines.push({ id: s.id, field: "fr", fr: s.fr, en: s.en });
  }
  for (const l of story) lines.push({ id: l.id, field: "fr", fr: l.fr, en: l.en });

  try {
    const out = await call(t.user_id, conn, "check", checkOut, checkPrompt(learnerOf(t), lines));
    const known = new Set(lines.map((l) => l.id));
    for (const issue of out.issues.filter((i) => known.has(i.id)).slice(0, 40)) {
      const flag: Flag = { problem: issue.problem, suggestion: issue.suggestion, field: "fr" };
      datas.forEach((d) => flagIn(d, issue.id, flag, true));
      const l = story.find((x) => x.id === issue.id);
      if (l) l.flag = flag;
    }
    await Promise.all(
      sections.map((s, i) => db().from("topic_sections").update({ data: datas[i] }).eq("id", s.id).eq("user_id", t.user_id)),
    );
  } catch (err) {
    // The review is a safety net: if it fails, the topic is still usable with the rule-based flags.
    logError("check", err);
  }
  await updateTopic(t.id, t.user_id, { story_fr: story, stage: "done", status: "ready", error: null });
}

/** Runs (or continues) the generation job for a topic. Never throws: failures are saved on the topic. */
export async function runGeneration(topicId: string, userId: string, conn: Conn) {
  try {
    let t = await loadTopic(topicId, userId);
    await updateTopic(topicId, userId, { status: "generating", error: null, gen_started_at: new Date().toISOString(), model_used: `${conn.provider}/${conn.model}` });
    if (t.stage === "outline") await outlineStage(t, conn);
    t = await loadTopic(topicId, userId);
    if (t.stage === "sections") await sectionsStage(t, conn);
    t = await loadTopic(topicId, userId);
    if (t.stage === "story") await storyStage(t, conn);
    t = await loadTopic(topicId, userId);
    if (t.stage === "check") await checkStage(t, conn);
    t = await loadTopic(topicId, userId);
    if (t.stage === "done") await updateTopic(topicId, userId, { status: "ready" });
  } catch (err) {
    logError("generation", err);
    await updateTopic(topicId, userId, { status: "failed", error: toAppError(err).message }).catch(() => {});
  }
}

/** Rewrites one section now (used by "Regenerate" and "Add words about…"). */
export async function regenerateSection(topicId: string, sectionId: string, userId: string, conn: Conn, extraRequest?: string | null) {
  const t = await loadTopic(topicId, userId);
  const all = await loadSections(topicId, userId);
  const s = all.find((x) => x.id === sectionId);
  if (!s) throw new AppError("bad_request", "Section not found.", 404);
  if (extraRequest) {
    // Keep what is there and add to it.
    const before = sectionDataSchema.parse(s.data);
    await writeSection(t, conn, all, s, extraRequest);
    const after = sectionDataSchema.parse((await loadSections(topicId, userId)).find((x) => x.id === sectionId)!.data);
    const known = new Set(before.words.map((w) => w.fr.toLowerCase()));
    const merged: SectionData = {
      words: [...before.words, ...after.words.filter((w) => !known.has(w.fr.toLowerCase()))],
      sentences: [...before.sentences, ...after.sentences],
      tips: before.tips.length ? before.tips : after.tips,
    };
    await db().from("topic_sections").update({ data: merged }).eq("id", sectionId).eq("user_id", userId);
  } else {
    await writeSection(t, conn, all, s);
  }
}
