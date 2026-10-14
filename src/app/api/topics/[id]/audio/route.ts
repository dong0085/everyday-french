import { api } from "@/lib/http";
import { getTopic } from "@/lib/data";
import { connections } from "@/lib/conn";
import { clipsFor } from "@/lib/audio/clips";
import { frenchLines } from "@/lib/content/schema";
import { AppError } from "@/lib/providers/errors";

// Which lines of a topic have recordings, and what the rest would cost.
export const GET = api<{ id: string }>("none", async ({ userId, params }) => {
  const topic = await getTopic(params.id);
  if (!topic) throw new AppError("bad_request", "Topic not found.", 404);
  const { tts } = await connections(userId);
  const lines = frenchLines(topic.sections, topic.storyFr, topic.dialogue, topic.nextTime);
  const clips = await clipsFor(userId, lines, tts);
  const missing = lines
    .map((text, i) => ({ text, prev: lines[i - 1] ?? null, next: lines[i + 1] ?? null }))
    .filter((l) => !clips[l.text]);
  return {
    clips,
    missing,
    chars: missing.reduce((n, l) => n + l.text.length, 0),
    tts: tts ? { provider: tts.provider, model: tts.model, voice: tts.voice, voiceName: tts.voiceName ?? tts.voice } : null,
  };
});
