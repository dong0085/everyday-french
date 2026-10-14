import { api } from "@/lib/http";
import { createClient } from "@/lib/supabase/server";
import { fold } from "@/lib/content/french";
import { sectionDataSchema } from "@/lib/content/schema";

export const GET = api("none", async ({ req }) => {
  const q = fold((req.nextUrl.searchParams.get("q") ?? "").trim()).slice(0, 60);
  if (q.length < 2) return { hits: [] };
  const supabase = await createClient();
  const pattern = `%${q.replace(/[\\%_]/g, (c) => "\\" + c)}%`;
  const { data } = await supabase
    .from("topic_sections")
    .select("slug, title_fr, data, topic_id, topics(title_fr)")
    .ilike("search_text", pattern)
    .limit(40);
  const hits = [];
  for (const s of data ?? []) {
    const d = sectionDataSchema.parse(s.data);
    const topicTitleFr = (s.topics as { title_fr: string } | null)?.title_fr ?? "";
    for (const item of [...d.words, ...d.sentences]) {
      if (fold(item.fr).includes(q) || fold(item.en).includes(q) || (item.zh ?? "").includes(q))
        hits.push({ topicId: s.topic_id, topicTitleFr, sectionSlug: s.slug, sectionTitleFr: s.title_fr, fr: item.fr, en: item.en });
    }
  }
  return { hits: hits.slice(0, 60) };
});
