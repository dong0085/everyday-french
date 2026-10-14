import { z } from "zod";
import { api, readJson } from "@/lib/http";
import { createClient } from "@/lib/supabase/server";
import { provider as providerInfo } from "@/lib/providers/catalog";
import { mockAllowed } from "@/lib/providers/mock";
import { AppError } from "@/lib/providers/errors";
import { LEVELS } from "@/lib/content/schema";

const conn = z.object({ provider: z.string().max(30), model: z.string().min(1).max(120), keyId: z.string().uuid().nullish() });
const body = z.object({
  level: z.enum(LEVELS).optional(),
  selfGender: z.enum(["m", "f", "x"]).optional(),
  explainLang: z.enum(["en", "zh"]).optional(),
  zhGloss: z.boolean().optional(),
  setUp: z.literal(true).optional(),
  llm: conn.nullable().optional(),
  tts: conn.extend({ voice: z.string().min(1).max(120), voiceName: z.string().max(120).optional() }).nullable().optional(),
  stt: conn.nullable().optional(),
});

function checkProvider(id: string, use: "text" | "speech" | "transcribe") {
  const p = providerInfo(id);
  if (!p || !p.uses.includes(use) || (id === "mock" && !mockAllowed())) throw new AppError("bad_request", "That provider can't do this.");
}

export const PATCH = api("json", async ({ req, userId }) => {
  const b = await readJson(req, body);
  if (b.llm) checkProvider(b.llm.provider, "text");
  if (b.tts) checkProvider(b.tts.provider, "speech");
  if (b.stt) checkProvider(b.stt.provider, "transcribe");
  const patch = {
    ...(b.level && { level: b.level }),
    ...(b.selfGender && { self_gender: b.selfGender }),
    ...(b.explainLang && { explain_lang: b.explainLang }),
    ...(b.zhGloss !== undefined && { zh_gloss: b.zhGloss }),
    ...(b.setUp && { set_up_at: new Date().toISOString() }),
    ...(b.llm !== undefined && { llm: b.llm }),
    ...(b.tts !== undefined && { tts: b.tts }),
    ...(b.stt !== undefined && { stt: b.stt }),
  };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
  return { ok: true };
});
