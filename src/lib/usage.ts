// Usage events: per-user rate limits, global daily caps, and the "this month" view in Settings.
import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { AppError, logError } from "@/lib/providers/errors";

export type Kind = "llm" | "tts" | "stt" | "key_test";

// Per user, per 10 minutes. Counts events (one LLM call, one clip, one transcription, one key test).
const PER_USER_10_MIN: Record<Kind, number> = { llm: 40, tts: 400, stt: 20, key_test: 30 };
// Whole app, per day: protects the free hosting tiers if someone scripts the API.
export const GLOBAL_PER_DAY: Record<Kind, number> = { llm: 5000, tts: 50000, stt: 1000, key_test: 2000 };

export async function checkLimit(userId: string, kind: Kind, cost = 1) {
  const db = adminClient();
  const since10 = new Date(Date.now() - 10 * 60_000).toISOString();
  const since24 = new Date(Date.now() - 24 * 3600_000).toISOString();
  const [mine, all] = await Promise.all([
    db.from("usage_events").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("kind", kind).gte("created_at", since10),
    db.from("usage_events").select("id", { count: "exact", head: true }).eq("kind", kind).gte("created_at", since24),
  ]);
  if ((mine.count ?? 0) + cost > PER_USER_10_MIN[kind]) throw new AppError("too_many", undefined, 429);
  if ((all.count ?? 0) + cost > GLOBAL_PER_DAY[kind])
    throw new AppError("too_many", "The app has reached its daily limit. Try again tomorrow.", 429);
}

export async function recordUsage(e: {
  userId: string;
  kind: Kind;
  provider?: string;
  model?: string;
  units?: number;
  unitType?: "tokens" | "chars" | "seconds";
  costUsd?: number | null;
}) {
  const { error } = await adminClient().from("usage_events").insert({
    user_id: e.userId,
    kind: e.kind,
    provider: e.provider ?? null,
    model: e.model ?? null,
    units: Math.round(e.units ?? 0),
    unit_type: e.unitType ?? null,
    cost_usd: e.costUsd ?? null,
  });
  if (error) logError("recordUsage", error);
}

export async function monthUsage(userId: string) {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const { data } = await adminClient()
    .from("usage_events")
    .select("kind, units, unit_type, cost_usd")
    .eq("user_id", userId)
    .gte("created_at", start.toISOString());
  const sum = { topicsTokens: 0, llmCalls: 0, ttsChars: 0, ttsClips: 0, sttSeconds: 0, costUsd: 0 };
  for (const r of data ?? []) {
    if (r.kind === "llm") {
      sum.llmCalls++;
      sum.topicsTokens += r.units;
    }
    if (r.kind === "tts") {
      sum.ttsClips++;
      sum.ttsChars += r.units;
    }
    if (r.kind === "stt") sum.sttSeconds += r.units;
    sum.costUsd += Number(r.cost_usd ?? 0);
  }
  return sum;
}
