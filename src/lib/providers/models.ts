// Free calls that check a key and list a provider's models.
import "server-only";
import type { ProviderKey } from "@/lib/keys/store";
import { provider as providerInfo } from "./catalog";
import { AppError, codeForStatus } from "./errors";
import { checkBaseUrl, pinnedFetch } from "./safe-fetch";

type Endpoint = { url: string; headers: Record<string, string> };

function modelsEndpoint(provider: string, key: string): Endpoint | null {
  const bearer = { Authorization: `Bearer ${key}` };
  switch (provider) {
    case "anthropic":
      return { url: "https://api.anthropic.com/v1/models?limit=100", headers: { "x-api-key": key, "anthropic-version": "2023-06-01" } };
    case "openai":
      return { url: "https://api.openai.com/v1/models", headers: bearer };
    case "google":
      return { url: "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", headers: { "x-goog-api-key": key } };
    case "mistral":
      return { url: "https://api.mistral.ai/v1/models", headers: bearer };
    case "deepseek":
      return { url: "https://api.deepseek.com/models", headers: bearer };
    case "groq":
      return { url: "https://api.groq.com/openai/v1/models", headers: bearer };
    case "xai":
      return { url: "https://api.x.ai/v1/models", headers: bearer };
    default:
      return null;
  }
}

async function getJson(url: string, headers: Record<string, string>, f: typeof fetch = fetch): Promise<unknown> {
  const res = await f(url, { headers, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new AppError(codeForStatus(res.status, body), undefined, 400);
  }
  return res.json();
}

/** Throws AppError when the key does not work. Costs nothing. */
export async function testKey(provider: string, key: string, baseUrl?: string | null): Promise<void> {
  if (provider === "openrouter") {
    await getJson("https://openrouter.ai/api/v1/key", { Authorization: `Bearer ${key}` });
    return;
  }
  if (provider === "elevenlabs") {
    await getJson("https://api.elevenlabs.io/v1/user/subscription", { "xi-api-key": key });
    return;
  }
  if (provider === "custom") {
    const base = checkBaseUrl(baseUrl ?? "");
    const f = await pinnedFetch(base);
    await getJson(base.toString().replace(/\/$/, "") + "/models", { Authorization: `Bearer ${key}` }, f);
    return;
  }
  const ep = modelsEndpoint(provider, key);
  if (!ep) throw new AppError("bad_request", "Unknown provider.");
  await getJson(ep.url, ep.headers);
}

const NOT_CHAT = /(embed|tts|transcribe|whisper|audio|realtime|image|dall-e|moderation|search|guard|computer-use|codex|vision-exp|-live|native-audio)/i;

/** Text models: curated ones first (with labels and prices), then everything else the key can use. */
export async function listTextModels(key: ProviderKey): Promise<{ id: string; label: string }[]> {
  const curated = (providerInfo(key.provider)?.textModels ?? []).map((m) => ({ id: m.id, label: m.label }));
  let live: string[] = [];
  try {
    if (key.provider === "openrouter") {
      const j = (await getJson("https://openrouter.ai/api/v1/models?supported_parameters=structured_outputs", {})) as {
        data: { id: string }[];
      };
      live = j.data.map((m) => m.id);
    } else if (key.provider === "custom") {
      const base = checkBaseUrl(key.baseUrl ?? "");
      const j = (await getJson(base.toString().replace(/\/$/, "") + "/models", { Authorization: `Bearer ${key.key}` }, await pinnedFetch(base))) as {
        data?: { id: string }[];
      };
      live = (j.data ?? []).map((m) => m.id);
    } else {
      const ep = modelsEndpoint(key.provider, key.key);
      if (ep) {
        const j = (await getJson(ep.url, ep.headers)) as {
          data?: { id: string }[];
          models?: { name: string; supportedGenerationMethods?: string[] }[];
        };
        live =
          key.provider === "google"
            ? (j.models ?? [])
                .filter((m) => m.supportedGenerationMethods?.includes("generateContent") && m.name.includes("gemini"))
                .map((m) => m.name.replace(/^models\//, ""))
            : (j.data ?? []).map((m) => m.id);
        if (key.provider === "openai") live = live.filter((id) => /^(gpt-|o\d)/.test(id));
      }
    }
  } catch {
    // The curated list still works when the live list fails.
  }
  const seen = new Set(curated.map((m) => m.id));
  const extra = live
    .filter((id) => !seen.has(id) && !NOT_CHAT.test(id))
    .sort()
    .map((id) => ({ id, label: id }));
  return [...curated, ...extra];
}
