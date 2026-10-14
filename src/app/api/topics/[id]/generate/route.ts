import { after } from "next/server";
import { api } from "@/lib/http";
import { requireLlm } from "@/lib/conn";
import { createClient } from "@/lib/supabase/server";
import { runGeneration } from "@/lib/content/pipeline";
import { AppError } from "@/lib/providers/errors";
import { checkLimit } from "@/lib/usage";

export const maxDuration = 300;
const STALE_MS = 6 * 60_000; // longer than any job can run (maxDuration), so it must have stopped

// Continues a failed or interrupted generation from the stage where it stopped.
export const POST = api<{ id: string }>("json", async ({ userId, params }) => {
  const supabase = await createClient();
  const { data: t } = await supabase.from("topics").select("status, gen_started_at").eq("id", params.id).maybeSingle();
  if (!t) throw new AppError("bad_request", "Topic not found.", 404);
  const stale = t.status === "generating" && Date.now() - new Date(t.gen_started_at ?? 0).getTime() > STALE_MS;
  if (t.status === "generating" && !stale) return { ok: true, running: true };
  const conn = await requireLlm(userId);
  await checkLimit(userId, "llm", 3);
  await supabase.from("topics").update({ status: "generating", gen_started_at: new Date().toISOString(), error: null }).eq("id", params.id);
  // A topic that finished but is being re-run (e.g. after edits) re-runs only the review.
  after(() => runGeneration(params.id, userId, conn));
  return { ok: true };
});
