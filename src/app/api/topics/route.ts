import { after } from "next/server";
import { z } from "zod";
import { api, readJson } from "@/lib/http";
import { connections, requireLlm } from "@/lib/conn";
import { createClient } from "@/lib/supabase/server";
import { runGeneration } from "@/lib/content/pipeline";
import { checkLimit } from "@/lib/usage";

export const maxDuration = 300;

const body = z.object({
  text: z.string().trim().min(10, "Write a little more about what happened.").max(8000),
  answers: z.array(z.object({ question: z.string().max(300), answer: z.string().max(1000) })).max(3).optional(),
  captureId: z.string().uuid().optional(),
});

export const POST = api("json", async ({ req, userId }) => {
  const input = await readJson(req, body);
  const conn = await requireLlm(userId);
  const { profile } = await connections(userId);
  await checkLimit(userId, "llm", 5);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("topics")
    .insert({
      user_id: userId,
      source_text: input.text,
      answers: input.answers ?? null,
      level: profile.level,
      explain_lang: profile.explain_lang,
      self_gender: profile.self_gender,
      zh_gloss: profile.zh_gloss,
      status: "generating",
      stage: "outline",
      model_used: `${conn.provider}/${conn.model}`,
      gen_started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  if (input.captureId) await supabase.from("captures").update({ status: "used", topic_id: data.id }).eq("id", input.captureId);

  // Keeps running after the response, up to maxDuration, even if the user leaves the page.
  after(() => runGeneration(data.id, userId, conn));
  return { id: data.id };
});
