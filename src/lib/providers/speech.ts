// Text-to-speech, speech-to-text and ElevenLabs account calls, over the providers' REST APIs.
import "server-only";
import type { ProviderKey } from "@/lib/keys/store";
import { AppError, codeForStatus } from "./errors";
import { MOCK_TRANSCRIPT, mockAllowed, silentMp3 } from "./mock";

const EL = "https://api.elevenlabs.io";

async function failIfBad(res: Response) {
  if (res.ok) return;
  const body = await res.text().catch(() => "");
  throw new AppError(codeForStatus(res.status, body), undefined, 502);
}

// ---------- text to speech ----------

export type SpeechRequest = {
  key: ProviderKey | "mock";
  model: string;
  voice: string;
  text: string;
  prev?: string | null;
  next?: string | null;
};

/** A bare word or chunk without final punctuation is read more naturally with a period. */
function speakable(text: string): string {
  const t = text.trim();
  return /[.!?…»"]$/.test(t) ? t : t + ".";
}

export async function synthesize(req: SpeechRequest): Promise<Uint8Array> {
  if (req.key === "mock") {
    if (!mockAllowed()) throw new AppError("bad_request");
    return silentMp3();
  }
  const signal = AbortSignal.timeout(60_000);

  if (req.key.provider === "elevenlabs") {
    const v4 = req.model.startsWith("eleven_v4") || req.model.startsWith("eleven_v3");
    const body: Record<string, unknown> = {
      // v3/v4 read [bracketed] text as audio tags, so brackets are removed.
      text: speakable(v4 ? req.text.replace(/\[[^\]]*\]/g, "") : req.text),
      model_id: req.model,
      voice_settings: { stability: 0.6, similarity_boost: 0.75 },
    };
    // Models that honour language_code are locked to French, so short words are not read as English.
    if (v4 || req.model.includes("flash_v2_5") || req.model.includes("turbo_v2_5")) body.language_code = "fr";
    if (!v4) {
      if (req.prev) body.previous_text = req.prev;
      if (req.next) body.next_text = req.next;
    }
    const res = await fetch(`${EL}/v1/text-to-speech/${encodeURIComponent(req.voice)}?output_format=mp3_44100_64`, {
      method: "POST",
      headers: { "xi-api-key": req.key.key, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify(body),
      signal,
    });
    await failIfBad(res);
    return new Uint8Array(await res.arrayBuffer());
  }

  if (req.key.provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${req.key.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: req.model,
        voice: req.voice,
        input: speakable(req.text),
        response_format: "mp3",
        ...(req.model.startsWith("gpt-")
          ? { instructions: "Speak standard French with a natural accent from France. Clear, calm, natural pace." }
          : {}),
      }),
      signal,
    });
    await failIfBad(res);
    return new Uint8Array(await res.arrayBuffer());
  }

  throw new AppError("bad_request", "This provider does not make audio.");
}

// ---------- speech to text ----------

export async function transcribe(opts: { key: ProviderKey | "mock"; model: string; audio: Blob; filename: string }): Promise<string> {
  if (opts.key === "mock") {
    if (!mockAllowed()) throw new AppError("bad_request");
    return MOCK_TRANSCRIPT;
  }
  const form = new FormData();
  form.append("file", opts.audio, opts.filename);
  const signal = AbortSignal.timeout(120_000);
  let url: string;
  let headers: Record<string, string>;

  switch (opts.key.provider) {
    case "openai":
      url = "https://api.openai.com/v1/audio/transcriptions";
      headers = { Authorization: `Bearer ${opts.key.key}` };
      form.append("model", opts.model);
      form.append("prompt", "The speaker may mix Chinese, English and French in one recording.");
      break;
    case "groq":
      url = "https://api.groq.com/openai/v1/audio/transcriptions";
      headers = { Authorization: `Bearer ${opts.key.key}` };
      form.append("model", opts.model);
      break;
    case "elevenlabs":
      url = `${EL}/v1/speech-to-text`;
      headers = { "xi-api-key": opts.key.key };
      form.append("model_id", opts.model);
      break;
    default:
      throw new AppError("bad_request", "This provider does not transcribe audio.");
  }
  const res = await fetch(url, { method: "POST", headers, body: form, signal });
  await failIfBad(res);
  const json = (await res.json()) as { text?: string };
  return (json.text ?? "").trim();
}

// ---------- ElevenLabs account ----------

export type ElevenVoice = {
  id: string;
  name: string;
  description: string;
  previewUrl: string | null;
  french: boolean;
};

export async function elevenVoices(key: ProviderKey): Promise<ElevenVoice[]> {
  const res = await fetch(`${EL}/v2/voices?page_size=100`, { headers: { "xi-api-key": key.key }, signal: AbortSignal.timeout(20_000) });
  await failIfBad(res);
  type Raw = {
    voice_id: string;
    name: string;
    labels?: Record<string, string>;
    preview_url?: string | null;
    verified_languages?: { language?: string; preview_url?: string | null }[];
  };
  const { voices } = (await res.json()) as { voices: Raw[] };
  return voices
    .map((v) => {
      const fr = v.verified_languages?.find((l) => l.language === "fr");
      const labels = v.labels ?? {};
      return {
        id: v.voice_id,
        name: v.name,
        description: [labels.accent, labels.gender, labels.age, labels.descriptive].filter(Boolean).join(", "),
        previewUrl: fr?.preview_url ?? v.preview_url ?? null,
        french: Boolean(fr) || /french|fran[cç]ais|parisian/i.test(`${labels.accent ?? ""} ${labels.language ?? ""}`),
      };
    })
    .sort((a, b) => Number(b.french) - Number(a.french) || a.name.localeCompare(b.name));
}

export type ElevenQuota = { used: number; limit: number; tier: string; concurrency: number };

// Concurrent request limits per plan (Flash models); unknown tiers get the safe minimum.
const CONCURRENCY: Record<string, number> = { free: 2, starter: 3, creator: 5, pro: 8, scale: 10, business: 10 };

export async function elevenQuota(key: ProviderKey): Promise<ElevenQuota> {
  const res = await fetch(`${EL}/v1/user/subscription`, { headers: { "xi-api-key": key.key }, signal: AbortSignal.timeout(15_000) });
  await failIfBad(res);
  const j = (await res.json()) as { character_count?: number; character_limit?: number; tier?: string };
  const tier = (j.tier ?? "free").toLowerCase();
  return {
    used: j.character_count ?? 0,
    limit: j.character_limit ?? 0,
    tier,
    concurrency: CONCURRENCY[tier.split("_")[0]] ?? 2,
  };
}
