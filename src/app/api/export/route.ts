import { NextResponse } from "next/server";
import { api } from "@/lib/http";
import { createClient } from "@/lib/supabase/server";

// Everything the user wrote, as one JSON file (no keys, no recordings).
export const GET = api("none", async ({ req }) => {
  const supabase = await createClient();
  const only = req.nextUrl.searchParams.get("topic");
  let q = supabase
    .from("topics")
    .select("title, title_fr, summary, story, source_text, level, story_fr, gender_note, model_used, created_at, topic_sections(position, slug, title, title_fr, intro, data)")
    .eq("status", "ready")
    .order("created_at");
  if (only) q = q.eq("id", only);
  const { data } = await q;
  const file = {
    format: "everyday-french/v1",
    exportedAt: new Date().toISOString(),
    topics: (data ?? []).map((t) => ({ ...t, topic_sections: [...(t.topic_sections ?? [])].sort((a, b) => a.position - b.position) })),
  };
  return new NextResponse(JSON.stringify(file, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="everyday-french-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
});
