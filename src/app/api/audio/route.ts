import { z } from "zod";
import { api, readJson } from "@/lib/http";
import { connections } from "@/lib/conn";
import { getKey } from "@/lib/keys/store";
import { synthesize } from "@/lib/providers/speech";
import { AppError } from "@/lib/providers/errors";
import { adminClient } from "@/lib/supabase/admin";
import { clipKey } from "@/lib/audio/cache-key";
import { signedUrls } from "@/lib/audio/clips";
import { checkLimit, recordUsage } from "@/lib/usage";

export const maxDuration = 90;

const body = z.object({
  text: z.string().trim().min(1).max(400),
  prev: z.string().max(400).nullish(),
  next: z.string().max(400).nullish(),
});

// OpenAI TTS cost per character, roughly (≈ $0.015 per minute of French speech).
const OPENAI_USD_PER_CHAR = 0.015 / (14 * 60);

// Makes one recording (if it does not exist yet) and returns its URL.
export const POST = api("json", async ({ req, userId }) => {
  const { text, prev, next } = await readJson(req, body);
  const { tts } = await connections(userId);
  if (!tts) throw new AppError("no_key", "Choose a voice in Settings first.");

  const db = adminClient();
  const cache_key = clipKey(tts.provider, tts.model, tts.voice, text);
  const existing = await db.from("clips").select("id, text, cache_key, storage_path, signed_url, signed_until").eq("user_id", userId).eq("cache_key", cache_key).maybeSingle();
  if (existing.data) {
    const urls = await signedUrls(userId, [existing.data]);
    return { text, url: urls.get(existing.data.id) };
  }

  await checkLimit(userId, "tts");
  const key = tts.provider === "mock" ? ("mock" as const) : await getKey(userId, tts.provider, tts.keyId);
  const mp3 = await synthesize({ key, model: tts.model, voice: tts.voice, text, prev, next });

  const storage_path = `${userId}/${cache_key}.mp3`;
  const up = await db.storage.from("clips").upload(storage_path, mp3, { contentType: "audio/mpeg", cacheControl: "31536000", upsert: true });
  if (up.error) throw up.error;
  const { data: row, error } = await db
    .from("clips")
    .upsert(
      { user_id: userId, cache_key, text, provider: tts.provider, model: tts.model, voice: tts.voice, storage_path, bytes: mp3.byteLength },
      { onConflict: "user_id,cache_key" },
    )
    .select("id, text, cache_key, storage_path, signed_url, signed_until")
    .single();
  if (error) throw error;
  await recordUsage({
    userId,
    kind: "tts",
    provider: tts.provider,
    model: tts.model,
    units: text.length,
    unitType: "chars",
    costUsd: tts.provider === "openai" ? text.length * OPENAI_USD_PER_CHAR : null,
  });
  const urls = await signedUrls(userId, [row]);
  return { text, url: urls.get(row.id) };
});
