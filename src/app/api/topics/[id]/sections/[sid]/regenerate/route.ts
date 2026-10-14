import { z } from "zod";
import { api, readJson } from "@/lib/http";
import { requireLlm } from "@/lib/conn";
import { regenerateSection } from "@/lib/content/pipeline";
import { syncReviewItems } from "@/lib/review";
import { checkLimit } from "@/lib/usage";

export const maxDuration = 300;

export const POST = api<{ id: string; sid: string }>("json", async ({ req, userId, params }) => {
  const b = await readJson(req, z.object({ extra: z.string().trim().max(300).nullish() }));
  const conn = await requireLlm(userId);
  await checkLimit(userId, "llm");
  await regenerateSection(params.id, params.sid, userId, conn, b.extra || null);
  await syncReviewItems(params.id, userId);
  return { ok: true };
});
