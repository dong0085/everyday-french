import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getUserId } from "@/lib/supabase/server";
import { clipsFor } from "@/lib/audio/clips";
import { connections } from "@/lib/conn";
import { contentOf } from "@/lib/review";
import { WordBank, type WordRow } from "@/components/WordBank";

export const metadata: Metadata = { title: "Words" };

export default async function WordsPage() {
  const userId = await getUserId();
  if (!userId) redirect("/");
  const supabase = await createClient();
  const [{ data: topics }, { data: items }] = await Promise.all([
    supabase
      .from("topics")
      .select("id, title_fr, is_example, story_fr, topic_sections(data, position)")
      .eq("user_id", userId)
      .eq("status", "ready")
      .order("created_at", { ascending: false }),
    // Only the rows the word bank shows something for: starred, or "shaky" (Not yet twice or more).
    supabase.from("review_items").select("topic_id, line_id, starred, lapses").eq("user_id", userId).or("starred.eq.true,lapses.gte.2"),
  ]);
  const marks = new Map((items ?? []).map((r) => [`${r.topic_id}:${r.line_id}`, r]));

  const rows: WordRow[] = [];
  for (const t of topics ?? []) {
    for (const { data } of contentOf(t).sections) {
      for (const w of data.words) {
        const m = marks.get(`${t.id}:${w.id}`);
        rows.push({
          key: `${t.id}:${w.id}`,
          topicId: t.id,
          topicTitleFr: t.title_fr,
          lineId: w.id,
          fr: w.fr,
          en: w.en,
          zh: w.zh,
          type: w.type,
          gender: w.gender,
          ipa: w.ipa,
          say: w.say,
          forms: w.forms,
          plural: w.plural,
          note: w.note,
          example: w.example,
          core: w.core,
          starred: m?.starred ?? false,
          shaky: (m?.lapses ?? 0) >= 2,
        });
      }
    }
  }
  const topicCount = new Set(rows.map((r) => r.topicId)).size;

  // Recordings for the words (examples play with the device voice unless recorded too), in batches.
  const { tts } = await connections(userId);
  const texts = [...new Set(rows.flatMap((r) => (r.example ? [r.fr, r.example.fr] : [r.fr])))];
  const batches: string[][] = [];
  for (let i = 0; i < texts.length; i += 150) batches.push(texts.slice(i, i + 150));
  const clips = Object.assign({}, ...(await Promise.all(batches.map((b) => clipsFor(userId, b, tts)))));

  return <WordBank rows={rows} topicCount={topicCount} clips={clips} />;
}
