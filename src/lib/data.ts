// Reads for pages, as the signed-in user (RLS applies).
import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { todayIn } from "@/lib/review";
import { frenchLines, sectionDataSchema, type DialogueLine, type NextTimeLine, type SectionData, type StoryLine } from "@/lib/content/schema";
import { INSTRUCTIONS, learnerOf, outlinePrompt } from "@/lib/content/prompt";

export type Profile = Awaited<ReturnType<typeof getProfile>>;

/**
 * The database could not be reached (paused free project, network, outage). Pages catch it and show
 * <Unavailable /> instead of an empty library, so "my topics are gone" never appears by mistake.
 */
export class DbUnavailableError extends Error {
  readonly code = "db_unavailable";
  constructor(cause?: unknown) {
    super("The database is unavailable.", { cause });
  }
}

export function isDbUnavailable(e: unknown): e is DbUnavailableError {
  return e instanceof DbUnavailableError || (e instanceof Error && (e as { code?: string }).code === "db_unavailable");
}

/** Throws DbUnavailableError for a Supabase error. "No rows" from .single() is not an outage. */
function check(error: { code?: string; message?: string } | null) {
  if (error && error.code !== "PGRST116") throw new DbUnavailableError(error);
}

export async function getProfile(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  check(error);
  if (!data) throw new Error("Profile missing");
  return {
    ...data,
    llm: data.llm as { provider: string; model: string; keyId?: string | null } | null,
    tts: data.tts as { provider: string; model: string; voice: string; voiceName?: string; keyId?: string | null } | null,
    stt: data.stt as { provider: string; model: string; keyId?: string | null } | null,
  };
}

export type TopicSummary = {
  id: string;
  title: string;
  titleFr: string;
  status: string;
  createdAt: string;
  isExample: boolean;
  words: number;
  /** Example sentences in the sections. */
  sentences: number;
  lines: number;
  recorded: number;
  /** Last time the guided study was finished. */
  studiedAt: string | null;
  /** The topic's first "Next time, say…" line, if any. */
  nextTime: NextTimeLine | null;
};

export async function listTopics(): Promise<TopicSummary[]> {
  const supabase = await createClient();
  const [{ data: topics, error }, { data: clips, error: clipsError }] = await Promise.all([
    supabase
      .from("topics")
      .select("id, title, title_fr, status, created_at, is_example, story_fr, dialogue, next_time, studied_at, topic_sections(data)")
      .order("created_at", { ascending: false }),
    supabase.from("clips").select("text"),
  ]);
  check(error);
  check(clipsError);
  const recorded = new Set((clips ?? []).map((c) => c.text));
  return (topics ?? []).map((t) => {
    const sections = (t.topic_sections ?? []).map((s) => ({ data: sectionDataSchema.parse(s.data) }));
    const lines = frenchLines(sections, (t.story_fr as StoryLine[]) ?? [], (t.dialogue as DialogueLine[]) ?? [], (t.next_time as NextTimeLine[]) ?? []);
    return {
      id: t.id,
      title: t.title,
      titleFr: t.title_fr,
      status: t.status,
      createdAt: t.created_at,
      isExample: t.is_example,
      words: sections.reduce((n, s) => n + s.data.words.length, 0),
      sentences: sections.reduce((n, s) => n + s.data.sentences.length, 0),
      lines: lines.length,
      recorded: lines.filter((l) => recorded.has(l)).length,
      studiedAt: t.studied_at,
      nextTime: ((t.next_time as NextTimeLine[]) ?? [])[0] ?? null,
    };
  });
}

export type FullSection = {
  id: string;
  position: number;
  slug: string;
  title: string;
  titleFr: string;
  intro: string;
  status: string;
  error: string | null;
  data: SectionData;
};

export type FullTopic = {
  id: string;
  title: string;
  titleFr: string;
  summary: string;
  story: string;
  sourceText: string;
  answers: { question: string; answer: string }[];
  /** The rules and first-step prompt the AI got, rebuilt from the saved story and settings. Null for the example. */
  prompt: string | null;
  level: string;
  status: string;
  stage: string;
  error: string | null;
  modelUsed: string | null;
  storyFr: StoryLine[];
  dialogue: DialogueLine[];
  nextTime: NextTimeLine[];
  /** Last time the guided study was finished. */
  studiedAt: string | null;
  genderNote: string | null;
  isExample: boolean;
  createdAt: string;
  genStartedAt: string | null;
  updatedAt: string;
  /** Still "generating" long after any job could run (maxDuration), so it stopped. */
  stale: boolean;
  sections: FullSection[];
};

const STALE_MS = 6 * 60_000;

export async function getTopic(id: string): Promise<FullTopic | null> {
  const supabase = await createClient();
  const { data: t, error } = await supabase.from("topics").select("*").eq("id", id).maybeSingle();
  // A malformed id (not a uuid) is a "not found", not an outage.
  if (error && error.code !== "22P02") check(error);
  if (!t) return null;
  const { data: sections, error: sectionsError } = await supabase.from("topic_sections").select("*").eq("topic_id", id).order("position");
  check(sectionsError);
  const answers = Array.isArray(t.answers) ? (t.answers as { question: string; answer: string }[]) : [];
  return {
    id: t.id,
    title: t.title,
    titleFr: t.title_fr,
    summary: t.summary,
    story: t.story,
    sourceText: t.source_text,
    answers: answers.filter((a) => a.answer.trim()),
    prompt: t.is_example ? null : `${INSTRUCTIONS}\n\n${outlinePrompt(learnerOf(t), t.source_text, answers)}`,
    level: t.level,
    status: t.status,
    stage: t.stage,
    error: t.error,
    modelUsed: t.model_used,
    storyFr: (t.story_fr as StoryLine[]) ?? [],
    dialogue: (t.dialogue as DialogueLine[]) ?? [],
    nextTime: (t.next_time as NextTimeLine[]) ?? [],
    studiedAt: t.studied_at,
    genderNote: t.gender_note,
    isExample: t.is_example,
    createdAt: t.created_at,
    genStartedAt: t.gen_started_at,
    updatedAt: t.updated_at,
    stale: t.status === "generating" && Date.now() - new Date(t.gen_started_at ?? 0).getTime() > STALE_MS,
    sections: (sections ?? []).map((s) => ({
      id: s.id,
      position: s.position,
      slug: s.slug,
      title: s.title,
      titleFr: s.title_fr,
      intro: s.intro,
      status: s.status,
      error: s.error,
      data: sectionDataSchema.parse(s.data),
    })),
  };
}

export async function listCaptures() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("captures")
    .select("id, text, audio_path, created_at")
    .eq("status", "new")
    .order("created_at", { ascending: false });
  check(error);
  return data ?? [];
}

/** How many review cards are due today (or earlier). */
export async function countDueReviews(): Promise<number> {
  const supabase = await createClient();
  // The learner's own date (same time zone cookie as the Review page), so both show the same count.
  const today = todayIn((await cookies()).get("ef.tz")?.value);
  const { count, error } = await supabase.from("review_items").select("id", { count: "exact", head: true }).lte("due_on", today);
  check(error);
  return count ?? 0;
}
