import { z } from "zod";
import { api, readJson } from "@/lib/http";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/providers/errors";
import { contentOf } from "@/lib/review";

const body = z.object({ topicId: z.uuid(), lineId: z.string().min(1).max(40), starred: z.boolean() });

// Stars a word: it joins the review deck (extra words, the example's words), or just gets marked (core words).
// Unstarring removes a word that is only in the deck because of its star.
export const POST = api("json", async ({ req, userId }) => {
  const { topicId, lineId, starred } = await readJson(req, body);
  const supabase = await createClient();
  const { data: t } = await supabase
    .from("topics")
    .select("id, status, is_example, story_fr, topic_sections(data, position)")
    .eq("id", topicId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!t) throw new AppError("bad_request", "Topic not found.", 404);
  const word = contentOf(t)
    .sections.flatMap((s) => s.data.words)
    .find((w) => w.id === lineId);
  if (!word) throw new AppError("bad_request", "This word is no longer in the topic. Reload the page.", 404);

  const items = supabase.from("review_items");
  if (starred) {
    const { error } = await items.upsert(
      { user_id: userId, topic_id: topicId, line_id: lineId, kind: word.type === "phrase" ? "phrase" : "word", fr: word.fr.slice(0, 400), starred: true },
      { onConflict: "user_id,topic_id,line_id" },
    );
    if (error) throw error;
  } else {
    // Core words of the learner's own ready topics stay in the deck without a star.
    const inDeck = word.core && !t.is_example && t.status === "ready";
    const q = inDeck ? items.update({ starred: false }) : items.delete();
    const { error } = await q.eq("user_id", userId).eq("topic_id", topicId).eq("line_id", lineId);
    if (error) throw error;
  }
  return { ok: true, starred };
});
