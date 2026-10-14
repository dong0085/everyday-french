// One function for every structured AI call, whatever the provider.
import "server-only";
import { generateText, NoObjectGeneratedError, Output, type LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogle } from "@ai-sdk/google";
import { createMistral } from "@ai-sdk/mistral";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createGroq } from "@ai-sdk/groq";
import { createXai } from "@ai-sdk/xai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { z } from "zod";
import { INSTRUCTIONS } from "@/lib/content/prompt";
import type { ProviderKey } from "@/lib/keys/store";
import { provider as providerInfo } from "./catalog";
import { AppError } from "./errors";
import { checkBaseUrl, pinnedFetch } from "./safe-fetch";
import { mockOutput, mockAllowed } from "./mock";

export type Stage = "questions" | "outline" | "section" | "story" | "check";
export type Usage = { in: number; out: number };

export async function languageModel(key: ProviderKey, modelId: string): Promise<LanguageModel> {
  const apiKey = key.key;
  switch (key.provider) {
    case "anthropic":
      return createAnthropic({ apiKey })(modelId);
    case "openai":
      return createOpenAI({ apiKey })(modelId);
    case "google":
      return createGoogle({ apiKey })(modelId);
    case "mistral":
      return createMistral({ apiKey })(modelId);
    case "deepseek":
      return createDeepSeek({ apiKey })(modelId);
    case "groq":
      return createGroq({ apiKey })(modelId);
    case "xai":
      return createXai({ apiKey })(modelId);
    case "openrouter":
      return createOpenAICompatible({
        name: "openrouter",
        baseURL: providerInfo("openrouter")!.baseURL!,
        apiKey,
        supportsStructuredOutputs: true,
      })(modelId);
    case "custom": {
      if (!key.baseUrl) throw new AppError("bad_request", "This custom endpoint has no base URL.");
      const base = checkBaseUrl(key.baseUrl);
      return createOpenAICompatible({
        name: "custom",
        baseURL: base.toString().replace(/\/$/, ""),
        apiKey,
        supportsStructuredOutputs: key.supportsJsonSchema,
        fetch: await pinnedFetch(base),
      })(modelId);
    }
    default:
      throw new AppError("bad_request", "Unknown provider.");
  }
}

type ProviderOptions = Parameters<typeof generateText>[0]["providerOptions"];

function providerOptions(provider: string): ProviderOptions {
  // Teaching content needs care, not long reasoning: keep reasoning effort low where supported.
  if (provider === "openai") return { openai: { reasoningEffort: "low" } };
  // OpenRouter: only route to endpoints that really support structured output.
  if (provider === "openrouter") return { openrouter: { provider: { require_parameters: true } } };
  return undefined;
}

/**
 * Generates an object that matches `schema`. If the model's answer does not validate,
 * asks once more with the validation error included. `timeoutMs` covers both tries.
 */
export async function generateStructured<T>(opts: {
  key: ProviderKey | "mock";
  model: string;
  schema: z.ZodType<T>;
  prompt: string;
  stage: Stage;
  timeoutMs?: number;
}): Promise<{ output: T; usage: Usage }> {
  if (opts.key === "mock") {
    if (!mockAllowed()) throw new AppError("bad_request", "Unknown provider.");
    return { output: opts.schema.parse(mockOutput(opts.stage, opts.prompt)), usage: { in: 0, out: 0 } };
  }

  const model = await languageModel(opts.key, opts.model);
  const abortSignal = AbortSignal.timeout(opts.timeoutMs ?? 150_000);
  const run = async (prompt: string) => {
    const result = await generateText({
      model,
      instructions: INSTRUCTIONS,
      prompt: prompt + "\n\nAnswer with JSON that matches the requested structure.",
      output: Output.object({ schema: opts.schema }),
      maxRetries: 1,
      abortSignal,
      providerOptions: providerOptions(opts.key === "mock" ? "" : (opts.key as ProviderKey).provider),
    });
    return {
      output: result.output as T,
      usage: { in: result.usage.inputTokens ?? 0, out: result.usage.outputTokens ?? 0 },
    };
  };

  try {
    return await run(opts.prompt);
  } catch (err) {
    if (!NoObjectGeneratedError.isInstance(err)) throw err;
    const reason = err.cause instanceof Error ? err.cause.message.slice(0, 800) : "it did not match the structure";
    return await run(
      `${opts.prompt}\n\nYour previous answer could not be used because ${reason}. Return only valid JSON with every field present.`,
    );
  }
}
