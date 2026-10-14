import { z } from "zod";
import { api, readJson } from "@/lib/http";
import { getTopic } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/providers/errors";
import { storyLineSchema } from "@/lib/content/schema";

export const GET = api<{ id: string }>("none", async ({ params }) => {
  const topic = await getTopic(params.id);
  if (!topic) throw new AppError("bad_request", "Topic not found.", 404);
  return { topic };
});

const patch = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  titleFr: z.string().trim().min(1).max(200).optional(),
  storyFr: z.array(storyLineSchema).max(30).optional(),
});

export const PATCH = api<{ id: string }>("json", async ({ req, params }) => {
  const b = await readJson(req, patch);
  const supabase = await createClient();
  const { error } = await supabase
    .from("topics")
    .update({ ...(b.title && { title: b.title }), ...(b.titleFr && { title_fr: b.titleFr }), ...(b.storyFr && { story_fr: b.storyFr }) })
    .eq("id", params.id);
  if (error) throw error;
  return { ok: true };
});

export const DELETE = api<{ id: string }>("none", async ({ params }) => {
  const supabase = await createClient();
  const { error } = await supabase.from("topics").delete().eq("id", params.id);
  if (error) throw error;
  return { ok: true };
});
