// Every provider the app supports, with curated models and set-up guides.
// Safe to import in the browser: contains no secrets. Prices are USD per 1M tokens and are
// estimates for showing costs; update them here when providers change prices.

export type ProviderId =
  | "anthropic"
  | "openai"
  | "google"
  | "mistral"
  | "deepseek"
  | "groq"
  | "xai"
  | "openrouter"
  | "elevenlabs"
  | "custom"
  | "mock";

export type Use = "text" | "speech" | "transcribe";

export type TextModel = {
  id: string;
  label: string;
  price?: { in: number; out: number };
  tag?: "recommended" | "best" | "cheap" | "may-make-mistakes";
};

export type Provider = {
  id: ProviderId;
  name: string;
  uses: Use[];
  keyUrl?: string;
  keyHint?: string; // what keys look like
  guide?: string[]; // numbered steps to get a key
  note?: string;
  baseURL?: string; // OpenAI-compatible endpoint, for providers routed through @ai-sdk/openai-compatible
  textModels?: TextModel[];
  liveModels?: boolean; // the model list can be fetched with the user's key
  speechModels?: { id: string; label: string; tag?: "recommended" | "best" }[];
  voices?: { id: string; label: string }[]; // fixed voice lists (OpenAI)
  transcribeModels?: { id: string; label: string; tag?: "recommended" | "cheap" }[];
};

export const PROVIDERS: Provider[] = [
  {
    id: "google",
    name: "Google Gemini",
    uses: ["text"],
    keyUrl: "https://aistudio.google.com/apikey",
    keyHint: "AIza…",
    guide: [
      "Open Google AI Studio (link below) and sign in with your Google account.",
      "Click “Create API key”.",
      "Copy the key and paste it here.",
    ],
    note: "Has a free tier with no card needed. On the free tier, Google may use your prompts to improve its products.",
    liveModels: true,
    textModels: [
      // 2.5 models are closed to new Google accounts (404). 3.8 Flash doubles in price on 2027-01-01.
      { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash", price: { in: 0.75, out: 3.75 }, tag: "recommended" },
      { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite", price: { in: 0.3, out: 2.5 }, tag: "cheap" },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    uses: ["text"],
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyHint: "sk-ant-…",
    guide: [
      "Open the Anthropic Console (link below) and sign in.",
      "Add a small amount of credit under Billing (for example $5).",
      "Under API keys, click “Create key”.",
      "Copy the key and paste it here.",
    ],
    liveModels: true,
    textModels: [
      { id: "claude-haiku-5-5", label: "Claude Haiku 5.5", price: { in: 0.1, out: 0.5 }, tag: "recommended" },
      { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", price: { in: 2, out: 10 }, tag: "best" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    uses: ["text", "speech", "transcribe"],
    keyUrl: "https://platform.openai.com/api-keys",
    keyHint: "sk-…",
    guide: [
      "Open the OpenAI platform (link below) and sign in.",
      "Add a small amount of credit under Billing (for example $5).",
      "Under API keys, click “Create new secret key”.",
      "Copy the key and paste it here.",
    ],
    note: "One OpenAI key also works for natural audio and for turning voice memos into text.",
    liveModels: true,
    textModels: [
      { id: "gpt-5-mini", label: "GPT-5 mini", price: { in: 0.25, out: 2 }, tag: "recommended" },
      { id: "gpt-5.4-mini", label: "GPT-5.4 mini" },
      { id: "gpt-5.5", label: "GPT-5.5", tag: "best" },
      { id: "gpt-5-nano", label: "GPT-5 nano", price: { in: 0.05, out: 0.4 }, tag: "may-make-mistakes" },
    ],
    speechModels: [
      { id: "gpt-4o-mini-tts", label: "GPT-4o mini TTS", tag: "recommended" },
      { id: "tts-1-hd", label: "TTS-1 HD" },
    ],
    voices: ["marin", "cedar", "coral", "sage", "alloy", "ash", "ballad", "echo", "fable", "nova", "onyx", "shimmer", "verse"].map(
      (v) => ({ id: v, label: v[0].toUpperCase() + v.slice(1) }),
    ),
    transcribeModels: [
      { id: "gpt-4o-transcribe", label: "GPT-4o Transcribe", tag: "recommended" },
      { id: "gpt-4o-mini-transcribe", label: "GPT-4o mini Transcribe", tag: "cheap" },
    ],
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    uses: ["speech", "transcribe"],
    keyUrl: "https://elevenlabs.io/app/settings/api-keys",
    keyHint: "sk_…",
    guide: [
      "Open ElevenLabs (link below) and sign in.",
      "Go to Settings → API keys and create a key with Text to Speech, Voices and Speech to Text access.",
      "Copy the key and paste it here.",
    ],
    note: "The free plan includes about 10,000 characters a month — enough for a few topics.",
    speechModels: [
      { id: "eleven_flash_v2_5", label: "Flash v2.5 (fast, half price, French locked)", tag: "recommended" },
      { id: "eleven_v4", label: "Eleven v4 (best quality)", tag: "best" },
      { id: "eleven_multilingual_v2", label: "Multilingual v2" },
    ],
    transcribeModels: [{ id: "scribe_v2", label: "Scribe v2 (good with mixed languages)", tag: "recommended" }],
  },
  {
    id: "mistral",
    name: "Mistral",
    uses: ["text"],
    keyUrl: "https://console.mistral.ai/api-keys",
    guide: ["Open the Mistral console (link below) and sign in.", "Create an API key.", "Copy the key and paste it here."],
    note: "A French company with strong French.",
    liveModels: true,
    textModels: [
      { id: "mistral-small-latest", label: "Mistral Small", price: { in: 0.15, out: 0.6 }, tag: "recommended" },
      { id: "mistral-medium-latest", label: "Mistral Medium", tag: "best" },
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    uses: ["text"],
    keyUrl: "https://platform.deepseek.com/api_keys",
    keyHint: "sk-…",
    guide: ["Open the DeepSeek platform (link below) and sign in.", "Top up a small balance.", "Create an API key and paste it here."],
    liveModels: true,
    textModels: [
      { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash", price: { in: 0.14, out: 0.28 }, tag: "recommended" },
      { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro", tag: "best" },
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    uses: ["text"],
    keyUrl: "https://openrouter.ai/settings/keys",
    keyHint: "sk-or-…",
    guide: ["Open OpenRouter (link below) and sign in.", "Add credit, then create a key.", "Paste the key here and pick any model."],
    note: "One key for hundreds of models from many companies. The list shows only models that support structured output.",
    baseURL: "https://openrouter.ai/api/v1",
    liveModels: true,
    textModels: [],
  },
  {
    id: "groq",
    name: "Groq",
    uses: ["text", "transcribe"],
    keyUrl: "https://console.groq.com/keys",
    keyHint: "gsk_…",
    guide: ["Open the Groq console (link below) and sign in.", "Create an API key.", "Paste it here."],
    liveModels: true,
    textModels: [
      { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B", tag: "recommended" },
      { id: "moonshotai/kimi-k2-instruct-0905", label: "Kimi K2" },
    ],
    transcribeModels: [{ id: "whisper-large-v3-turbo", label: "Whisper large v3 turbo (cheapest, best with one language)", tag: "cheap" }],
  },
  {
    id: "xai",
    name: "xAI Grok",
    uses: ["text"],
    keyUrl: "https://console.x.ai",
    keyHint: "xai-…",
    guide: ["Open the xAI console (link below) and sign in.", "Create an API key.", "Paste it here."],
    liveModels: true,
    textModels: [{ id: "grok-4.20-non-reasoning", label: "Grok 4.20", tag: "recommended" }],
  },
  {
    id: "custom",
    name: "Custom (OpenAI-compatible)",
    uses: ["text"],
    note: "Any service with an OpenAI-compatible chat API over https. You give the base URL and the model name.",
    liveModels: true,
    textModels: [],
  },
];

export const MOCK_PROVIDER: Provider = {
  id: "mock",
  name: "Mock (tests only)",
  uses: ["text", "speech", "transcribe"],
  textModels: [{ id: "mock-model", label: "Mock model" }],
  speechModels: [{ id: "mock-tts", label: "Mock TTS" }],
  voices: [{ id: "mock-voice", label: "Mock voice" }],
  transcribeModels: [{ id: "mock-stt", label: "Mock STT" }],
};

export const RECOMMENDED_TEXT_PROVIDER: ProviderId = "google";

export function provider(id: string): Provider | undefined {
  return id === "mock" ? MOCK_PROVIDER : PROVIDERS.find((p) => p.id === id);
}

export function providersFor(use: Use, includeMock = false): Provider[] {
  return [...PROVIDERS, ...(includeMock ? [MOCK_PROVIDER] : [])].filter((p) => p.uses.includes(use));
}

/** Rough tokens for one topic (all stages), for cost estimates. */
export const TOPIC_TOKENS = { in: 30_000, out: 9_000 };

export function topicCostUsd(providerId: string, modelId: string): number | null {
  const m = provider(providerId)?.textModels?.find((x) => x.id === modelId);
  if (!m?.price) return null;
  return (TOPIC_TOKENS.in * m.price.in + TOPIC_TOKENS.out * m.price.out) / 1_000_000;
}

export function formatUsd(n: number): string {
  if (n < 0.01) return "< $0.01";
  return "$" + (n < 1 ? n.toFixed(2) : n.toFixed(2));
}
