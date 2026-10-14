import { z } from "zod";
import { api } from "@/lib/http";
import { createClient } from "@/lib/supabase/server";
import { sectionDataSchema, storyLineSchema } from "@/lib/content/schema";
import { AppError } from "@/lib/providers/errors";

const s = (max: number) => z.string().max(max).default("");
const topic = z.object({
  title: s(200),
  title_fr: s(200),
  summary: s(1000),
  story: s(8000),
  source_text: s(8000),
  level: z.enum(["A1", "A2", "B1", "B2"]).default("A2"),
  story_fr: z.array(storyLineSchema).max(30).default([]),
  gender_note: z.string().max(400).nullable().default(null),
  model_used: z.string().max(120).nullable().default(null),
  topic_sections: z
    .array(z.object({ slug: z.string().regex(/^[a-z0-9-]{1,48}$/), title: s(200), title_fr: s(200), intro: s(600), data: sectionDataSchema }))
    .min(1)
    .max(10),
});
const file = z.object({ format: z.literal("everyday-french/v1"), topics: z.array(topic).min(1).max(50) });

// Imports topics from an export file. Content is validated field by field; nothing runs from it.
export const POST = api("json", async ({ req, userId }) => {
  const raw = await req.text();
  if (raw.length > 2_000_000) throw new AppError("bad_request", "That file is too large.", 413);
  const parsed = file.safeParse(JSON.parse(raw));
  if (!parsed.success) throw new AppError("bad_request", "That is not an Everyday French export file.");
  const supabase = await createClient();
  let count = 0;
  for (const t of parsed.data.topics) {
    const { data: row, error } = await supabase
      .from("topics")
      .insert({
        user_id: userId,
        title: t.title,
        title_fr: t.title_fr,
        summary: t.summary,
        story: t.story,
        source_text: t.source_text,
        level: t.level,
        story_fr: t.story_fr,
        gender_note: t.gender_note,
        model_used: t.model_used ? `imported · ${t.model_used}` : "imported",
        status: "ready",
        stage: "done",
      })
      .select("id")
      .single();
    if (error) throw error;
    const used = new Set<string>();
    const sections = t.topic_sections
      .filter((x) => !used.has(x.slug) && used.add(x.slug))
      .map((x, i) => ({ topic_id: row.id, user_id: userId, position: i, slug: x.slug, title: x.title, title_fr: x.title_fr, intro: x.intro, data: x.data, status: "ready" }));
    await supabase.from("topic_sections").insert(sections);
    count++;
  }
  return { imported: count };
});
