import { z } from "zod";
import { api, readJson } from "@/lib/http";
import { connections, requireLlm } from "@/lib/conn";
import { getKey } from "@/lib/keys/store";
import { generateStructured } from "@/lib/providers/llm";
import { questionsPrompt } from "@/lib/content/prompt";
import { questionsOut, type Level } from "@/lib/content/schema";
import { checkLimit, recordUsage } from "@/lib/usage";

export const maxDuration = 120;

export const POST = api("json", async ({ req, userId }) => {
  const { text } = await readJson(req, z.object({ text: z.string().trim().min(10).max(8000) }));
  const conn = await requireLlm(userId);
  const { profile } = await connections(userId);
  await checkLimit(userId, "llm");
  const key = conn.provider === "mock" ? ("mock" as const) : await getKey(userId, conn.provider, conn.keyId);
  const learner = {
    level: profile.level as Level,
    explainLang: profile.explain_lang === "zh" ? ("zh" as const) : ("en" as const),
    selfGender: profile.self_gender as "m" | "f" | "x",
    zhGloss: profile.zh_gloss,
  };
  const { output, usage } = await generateStructured({ key, model: conn.model, schema: questionsOut, prompt: questionsPrompt(learner, text), stage: "questions", timeoutMs: 60_000 });
  await recordUsage({ userId, kind: "llm", provider: conn.provider, model: conn.model, units: usage.in + usage.out, unitType: "tokens" });
  return { questions: output.questions.slice(0, 3) };
});
