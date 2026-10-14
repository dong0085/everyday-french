import { z } from "zod";
import { api, readJson } from "@/lib/http";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/providers/errors";
import { pickToday, schedule } from "@/lib/review";

const body = z.object({
  id: z.uuid(),
  result: z.enum(["got", "again", "skip"]),
  /** The learner's date (YYYY-MM-DD), so "tomorrow" means their tomorrow. */
  today: z.string().max(10).optional(),
});

// Grades one review card: Got it / Not yet / Skip only decide when it comes back.
export const POST = api("json", async ({ req, userId }) => {
  const { id, result, today } = await readJson(req, body);
  const supabase = await createClient();
  const { data: row } = await supabase.from("review_items").select("id, box, reps, lapses").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!row) throw new AppError("bad_request", "This card is no longer in your review. Reload the page.", 404);
  const next = schedule(row, result, pickToday(today));
  const { error } = await supabase
    .from("review_items")
    .update({ ...next, last_seen: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  return { ok: true };
});
