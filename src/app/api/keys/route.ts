import { z } from "zod";
import { api, readJson } from "@/lib/http";
import { listKeys, saveKey, getKey } from "@/lib/keys/store";
import { testKey } from "@/lib/providers/models";
import { provider as providerInfo } from "@/lib/providers/catalog";
import { AppError } from "@/lib/providers/errors";
import { checkBaseUrl } from "@/lib/providers/safe-fetch";
import { elevenVoices } from "@/lib/providers/speech";
import { checkLimit, recordUsage } from "@/lib/usage";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export const GET = api("none", async ({ userId }) => ({ keys: await listKeys(userId) }));

const body = z.object({
  provider: z.string().max(30),
  key: z.string().trim().min(8).max(400),
  baseUrl: z.string().max(300).nullish(),
  supportsJsonSchema: z.boolean().optional(),
});

export const POST = api("json", async ({ req, userId }) => {
  const input = await readJson(req, body);
  const info = providerInfo(input.provider);
  if (!info || info.id === "mock") throw new AppError("bad_request", "Unknown provider.");
  if (/\s/.test(input.key)) throw new AppError("bad_request", "The key should not contain spaces.");

  let label = "default";
  let baseUrl: string | null = null;
  if (info.id === "custom") {
    const url = checkBaseUrl(input.baseUrl ?? "");
    baseUrl = url.toString().replace(/\/$/, "");
    label = url.hostname;
  }

  await checkLimit(userId, "key_test");
  await recordUsage({ userId, kind: "key_test", provider: info.id });
  await testKey(info.id, input.key, baseUrl);
  const keyId = await saveKey({ userId, provider: info.id, key: input.key, label, baseUrl, supportsJsonSchema: input.supportsJsonSchema });

  // First key for a use → make it the default, so the user can start right away.
  const supabase = await createClient();
  const { data: p } = await supabase.from("profiles").select("llm, tts, stt").eq("id", userId).single();
  const patch: Database["public"]["Tables"]["profiles"]["Update"] = {};
  if (!p?.llm && info.uses.includes("text")) {
    const model = info.textModels?.find((m) => m.tag === "recommended")?.id ?? info.textModels?.[0]?.id;
    if (model) patch.llm = { provider: info.id, model, keyId };
  }
  if (!p?.tts && info.uses.includes("speech")) {
    if (info.id === "openai") patch.tts = { provider: "openai", model: "gpt-4o-mini-tts", voice: "marin", voiceName: "Marin", keyId };
    if (info.id === "elevenlabs") {
      const voices = await elevenVoices(await getKey(userId, "elevenlabs", keyId)).catch(() => []);
      const v = voices[0];
      if (v) patch.tts = { provider: "elevenlabs", model: "eleven_flash_v2_5", voice: v.id, voiceName: v.name, keyId };
    }
  }
  if (!p?.stt && info.uses.includes("transcribe")) {
    const model = info.transcribeModels?.find((m) => m.tag === "recommended")?.id ?? info.transcribeModels?.[0]?.id;
    if (model) patch.stt = { provider: info.id, model, keyId };
  }
  if (Object.keys(patch).length) await supabase.from("profiles").update(patch).eq("id", userId);

  return { keyId, keys: await listKeys(userId), defaults: patch };
});
