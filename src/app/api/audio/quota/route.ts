import { api } from "@/lib/http";
import { connections } from "@/lib/conn";
import { getKey } from "@/lib/keys/store";
import { elevenQuota } from "@/lib/providers/speech";

// How many parallel requests to use, and (ElevenLabs) the characters left this month.
export const GET = api("none", async ({ userId }) => {
  const { tts } = await connections(userId);
  if (tts?.provider === "elevenlabs") {
    const q = await elevenQuota(await getKey(userId, "elevenlabs", tts.keyId));
    return { concurrency: q.concurrency, charsLeft: Math.max(0, q.limit - q.used), charLimit: q.limit, tier: q.tier };
  }
  return { concurrency: tts?.provider === "openai" ? 4 : 2, charsLeft: null };
});
