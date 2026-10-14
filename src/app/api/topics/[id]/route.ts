import { z } from "zod";
import { api, readJson } from "@/lib/http";
import { getTopic } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/providers/errors";
import { dialogueLineSchema, storyLineSchema } from "@/lib/content/schema";
import { syncReviewItems } from "@/lib/review";
import type { Database } from "@/lib/supabase/database.types";

export const GET = api<{ id: string }>("none", async ({ params }) => {
  const topic = await getTopic(params.id);
  if (!topic) throw new AppError("bad_request", "Topic not found.", 404);
  return { topic };
});

const patch = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  titleFr: z.string().trim().min(1).max(200).optional(),
  storyFr: z.array(storyLineSchema).max(30).optional(),
  dialogue: z.array(dialogueLineSchema).max(30).optional(),
  /** The guided study was finished: remember when. */
  studied: z.literal(true).optional(),
});

export const PATCH = api<{ id: string }>("json", async ({ req, params, userId }) => {
  const b = await readJson(req, patch);
  const update: Database["public"]["Tables"]["topics"]["Update"] = {
    ...(b.title && { title: b.title }),
    ...(b.titleFr && { title_fr: b.titleFr }),
    ...(b.storyFr && { story_fr: b.storyFr }),
    ...(b.dialogue && { dialogue: b.dialogue }),
    ...(b.studied && { studied_at: new Date().toISOString() }),
  };
  if (!Object.keys(update).length) return { ok: true };
  const supabase = await createClient();
  const { data, error } = await supabase.from("topics").update(update).eq("id", params.id).select("id");
  if (error) throw error;
  if (!data?.length) throw new AppError("bad_request", "Topic not found.", 404);
  if (b.storyFr || b.dialogue) await syncReviewItems(params.id, userId);
  return { ok: true };
});

export const DELETE = api<{ id: string }>("none", async ({ params }) => {
  const supabase = await createClient();
  const { error } = await supabase.from("topics").delete().eq("id", params.id);
  if (error) throw error;
  return { ok: true };
});
