import { z } from "zod";
import { api, readJson } from "@/lib/http";
import { createClient } from "@/lib/supabase/server";
import { sectionDataSchema } from "@/lib/content/schema";
import { AppError } from "@/lib/providers/errors";

// Saves the learner's edits to one section.
export const PATCH = api<{ id: string; sid: string }>("json", async ({ req, params }) => {
  const b = await readJson(req, z.object({ data: sectionDataSchema, titleFr: z.string().trim().min(1).max(200).optional(), title: z.string().trim().min(1).max(200).optional() }));
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("topic_sections")
    .update({ data: b.data, ...(b.titleFr && { title_fr: b.titleFr }), ...(b.title && { title: b.title }) })
    .eq("id", params.sid)
    .eq("topic_id", params.id)
    .select("id");
  if (error) throw error;
  if (!data?.length) throw new AppError("bad_request", "Section not found.", 404);
  return { ok: true };
});

export const DELETE = api<{ id: string; sid: string }>("none", async ({ params }) => {
  const supabase = await createClient();
  await supabase.from("topic_sections").delete().eq("id", params.sid).eq("topic_id", params.id);
  return { ok: true };
});
