// "Your turn": the learner writes one sentence of their own and gets gentle feedback.
// With save + sectionId, the corrected sentence is added to that section as the learner's own line.
import { api, readJson } from "@/lib/http";
import { connections } from "@/lib/conn";
import { createClient } from "@/lib/supabase/server";
import { getKey } from "@/lib/keys/store";
import { generateStructured } from "@/lib/providers/llm";
import { AppError } from "@/lib/providers/errors";
import { costOf } from "@/lib/content/pipeline";
import { feedbackPrompt, learnerOf } from "@/lib/content/prompt";
import { attemptBody, tidyFeedback } from "@/lib/content/feedback";
import { feedbackOut, newId, sectionDataSchema, sentenceSchema, type Sentence } from "@/lib/content/schema";
import { syncReviewItems } from "@/lib/review";
import { checkLimit, recordUsage } from "@/lib/usage";

export const maxDuration = 120;

export const POST = api<{ id: string }>("json", async ({ req, userId, params }) => {
  const b = await readJson(req, attemptBody);
  const { profile, llm } = await connections(userId);
  if (!llm) throw new AppError("no_key", "Feedback on your sentence needs an AI model. Connect one in Settings.");

  const supabase = await createClient();
  const { data: topic } = await supabase.from("topics").select("id, title, level").eq("id", params.id).maybeSingle();
  if (!topic) throw new AppError("bad_request", "Topic not found.", 404);
  let query = supabase.from("topic_sections").select("id, title_fr, data").eq("topic_id", topic.id).order("position");
  if (b.sectionId) query = query.eq("id", b.sectionId);
  const { data: sections } = await query;
  const section = b.sectionId ? sections?.[0] : null;
  if (b.sectionId && !section) throw new AppError("bad_request", "Section not found.", 404);

  // The words to practise: this section's core words and phrases, or the whole topic's.
  const datas = (section ? [section] : (sections ?? [])).map((s) => sectionDataSchema.safeParse(s.data)).flatMap((p) => (p.success ? [p.data] : []));
  const target = datas.flatMap((d) => d.words.filter((w) => w.core || w.type === "phrase").map((w) => w.fr)).slice(0, 10);

  await checkLimit(userId, "llm");
  const key = llm.provider === "mock" ? ("mock" as const) : await getKey(userId, llm.provider, llm.keyId);
  // Level from the topic; language, gender and gloss from the learner's current settings.
  const learner = learnerOf({ ...profile, level: topic.level });
  const { output, usage } = await generateStructured({
    key,
    model: llm.model,
    schema: feedbackOut,
    prompt: feedbackPrompt(learner, { topicTitle: topic.title, sectionTitleFr: section?.title_fr ?? null, target }, b.text),
    stage: "feedback",
    timeoutMs: 60_000,
  });
  await recordUsage({ userId, kind: "llm", provider: llm.provider, model: llm.model, units: usage.in + usage.out, unitType: "tokens", costUsd: costOf(llm, usage) });
  const feedback = tidyFeedback(output, b.text);

  const { error } = await supabase.from("attempts").insert({ user_id: userId, topic_id: topic.id, section_id: section?.id ?? null, text: b.text, feedback });
  if (error) throw error;

  let line: Sentence | null = null;
  if (b.save && section) {
    const data = sectionDataSchema.parse(section.data);
    if (data.sentences.length < 30) {
      line = sentenceSchema.parse({
        id: newId("m"),
        fr: feedback.fixed,
        en: feedback.en || "My sentence",
        zh: null,
        note: null,
        who: "me",
        say: null,
        mine: true,
        flag: null,
      });
      data.sentences.push(line);
      const { error: saveError } = await supabase.from("topic_sections").update({ data }).eq("id", section.id).eq("topic_id", topic.id);
      if (saveError) throw saveError;
      await syncReviewItems(topic.id, userId);
    }
  }
  return { feedback, line };
});
