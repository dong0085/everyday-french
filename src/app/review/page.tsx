import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { randomInt } from "node:crypto";
import { createClient, getUserId } from "@/lib/supabase/server";
import { sectionDataSchema, type StoryLine } from "@/lib/content/schema";
import { clipsFor } from "@/lib/audio/clips";
import { connections } from "@/lib/conn";
import { ReviewDeck, type Card } from "@/components/ReviewDeck";

export const metadata: Metadata = { title: "Review" };

export default async function ReviewPage() {
  const userId = await getUserId();
  if (!userId) redirect("/");
  const supabase = await createClient();
  const { data } = await supabase.from("topics").select("id, title_fr, story_fr, topic_sections(data)").eq("status", "ready");

  const pool: Card[] = [];
  for (const t of data ?? []) {
    for (const s of t.topic_sections ?? []) {
      const d = sectionDataSchema.parse(s.data);
      for (const w of d.words) pool.push({ fr: w.fr, en: w.en, zh: w.zh, kind: w.type === "phrase" ? "phrase" : "word", gender: w.gender, topicId: t.id, topicTitleFr: t.title_fr });
      for (const x of d.sentences) pool.push({ fr: x.fr, en: x.en, zh: x.zh, kind: "sentence", gender: null, topicId: t.id, topicTitleFr: t.title_fr });
    }
    for (const l of (t.story_fr as StoryLine[]) ?? []) pool.push({ fr: l.fr, en: l.en, zh: l.zh, kind: "sentence", gender: null, topicId: t.id, topicTitleFr: t.title_fr });
  }
  // Fisher–Yates, then 20 cards.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const cards = pool.slice(0, 20);
  const { tts } = await connections(userId);
  const clips = await clipsFor(userId, cards.map((c) => c.fr), tts);
  return <ReviewDeck cards={cards} clips={clips} />;
}
