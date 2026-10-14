// Reads for pages, as the signed-in user (RLS applies).
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { frenchLines, sectionDataSchema, type SectionData, type StoryLine } from "@/lib/content/schema";

export type Profile = Awaited<ReturnType<typeof getProfile>>;

export async function getProfile(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
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
  lines: number;
  recorded: number;
};

export async function listTopics(): Promise<TopicSummary[]> {
  const supabase = await createClient();
  const [{ data: topics }, { data: clips }] = await Promise.all([
    supabase
      .from("topics")
      .select("id, title, title_fr, status, created_at, is_example, story_fr, topic_sections(data)")
      .order("created_at", { ascending: false }),
    supabase.from("clips").select("text"),
  ]);
  const recorded = new Set((clips ?? []).map((c) => c.text));
  return (topics ?? []).map((t) => {
    const sections = (t.topic_sections ?? []).map((s) => ({ data: sectionDataSchema.parse(s.data) }));
    const lines = frenchLines(sections, (t.story_fr as StoryLine[]) ?? []);
    return {
      id: t.id,
      title: t.title,
      titleFr: t.title_fr,
      status: t.status,
      createdAt: t.created_at,
      isExample: t.is_example,
      words: sections.reduce((n, s) => n + s.data.words.length, 0),
      lines: lines.length,
      recorded: lines.filter((l) => recorded.has(l)).length,
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
  level: string;
  status: string;
  stage: string;
  error: string | null;
  modelUsed: string | null;
  storyFr: StoryLine[];
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
  const { data: t } = await supabase.from("topics").select("*").eq("id", id).maybeSingle();
  if (!t) return null;
  const { data: sections } = await supabase.from("topic_sections").select("*").eq("topic_id", id).order("position");
  return {
    id: t.id,
    title: t.title,
    titleFr: t.title_fr,
    summary: t.summary,
    story: t.story,
    sourceText: t.source_text,
    level: t.level,
    status: t.status,
    stage: t.stage,
    error: t.error,
    modelUsed: t.model_used,
    storyFr: (t.story_fr as StoryLine[]) ?? [],
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
  const { data } = await supabase
    .from("captures")
    .select("id, text, audio_path, created_at")
    .eq("status", "new")
    .order("created_at", { ascending: false });
  return data ?? [];
}
